"use client";

import React, { useState, useEffect, useRef } from "react";

// Format number to VND currency
const formatVND = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + '₫';
};

// Format raw numeric string to thousand-separated dots display
const formatNumberString = (value: string | number): string => {
  const cleanValue = String(value).replace(/\D/g, "");
  if (!cleanValue) return "";
  return new Intl.NumberFormat('vi-VN').format(parseInt(cleanValue, 10));
};

interface SpeedResult {
  speed: "fast" | "slow" | "normal" | "no_spend";
  badgeText: string;
  badgeClass: string;
  explanation: string;
  trendText: string;
  trendClass: string;
  suggestion: string;
}

const evaluateSpendSpeed = (
  reports: any[],
  budget: number,
  budgetMode: string,
  lang: "vi" | "en",
  isUsd?: boolean
): SpeedResult => {
  const formatVND = (val: number): string => {
    if (isUsd) {
      return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    }
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + '₫';
  };

  const totalReports = reports.length;
  const totalSpend = reports.reduce((acc, r) => acc + r.spend, 0);
  const averageDailySpend = totalReports > 0 ? totalSpend / totalReports : 0;
  
  // Latest report spend
  const latestReport = reports[reports.length - 1];
  const latestSpend = latestReport ? latestReport.spend : 0;

  // Use latest spend if active, otherwise average
  const speedMetric = latestSpend > 0 ? latestSpend : averageDailySpend;

  // Compute trend
  let trend: "rising" | "falling" | "stable" = "stable";
  if (reports.length >= 4) {
    const half = Math.floor(reports.length / 2);
    const firstHalf = reports.slice(0, half);
    const secondHalf = reports.slice(half);
    const firstAvg = firstHalf.reduce((sum, r) => sum + r.spend, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.spend, 0) / secondHalf.length;
    if (secondAvg > firstAvg * 1.2) {
      trend = "rising";
    } else if (secondAvg < firstAvg * 0.8) {
      trend = "falling";
    }
  }

  const trendText = lang === "vi" 
    ? (trend === "rising" ? "Tăng nhanh 📈" : trend === "falling" ? "Giảm nhanh 📉" : "Ổn định ➡️")
    : (trend === "rising" ? "Rising 📈" : trend === "falling" ? "Falling 📉" : "Stable ➡️");
    
  const trendClass = trend === "rising" 
    ? "text-rose-450" 
    : trend === "falling" 
      ? "text-blue-450" 
      : "text-gray-400";

  // No spend at all
  if (totalSpend === 0 && latestSpend === 0) {
    return {
      speed: "no_spend",
      badgeText: lang === "vi" ? "Không tiêu tiền 🚫" : "No Spend 🚫",
      badgeClass: "bg-gray-850 text-gray-400 border border-gray-800",
      explanation: lang === "vi" ? "Chiến dịch chưa phát sinh chi phí quảng cáo nào trong 30 ngày qua." : "Campaign has generated no advertising spend in the last 30 days.",
      trendText: lang === "vi" ? "Không hoạt động" : "Inactive",
      trendClass: "text-gray-500",
      suggestion: lang === "vi" ? "Kiểm tra cài đặt chiến dịch hoặc kích hoạt lại quảng cáo." : "Check campaign settings or reactivate the ads.",
    };
  }

  // Daily budget mode evaluation
  if (budgetMode === "BUDGET_MODE_DAY" && budget > 0) {
    const ratio = speedMetric / budget;
    if (ratio >= 0.85) {
      return {
        speed: "fast",
        badgeText: lang === "vi" ? "Tiêu nhanh ⚡" : "Fast Spend ⚡",
        badgeClass: "bg-rose-950/70 text-rose-350 border border-rose-900/60",
        explanation: lang === "vi" 
          ? `Chiến dịch đang tiêu tiền rất nhanh, xấp xỉ ${(ratio * 100).toFixed(0)}% ngân sách ngày (${formatVND(speedMetric)} / ${formatVND(budget)}).`
          : `Campaign is spending rapidly, approximately ${(ratio * 100).toFixed(0)}% of daily budget (${formatVND(speedMetric)} / ${formatVND(budget)}).`,
        trendText,
        trendClass,
        suggestion: lang === "vi"
          ? "Cân nhắc nâng thêm ngân sách ngày nếu ROI tốt để tránh bị dừng phân phối sớm."
          : "Consider scaling up the daily budget if ROI is positive to prevent early delivery pause.",
      };
    } else if (ratio < 0.3) {
      return {
        speed: "slow",
        badgeText: lang === "vi" ? "Tiêu chậm 🐢" : "Slow Spend 🐢",
        badgeClass: "bg-blue-950/70 text-blue-350 border border-blue-900/60",
        explanation: lang === "vi"
          ? `Chiến dịch tiêu tiền chậm, chỉ đạt ${(ratio * 100).toFixed(0)}% ngân sách ngày (${formatVND(speedMetric)} / ${formatVND(budget)}).`
          : `Campaign is spending slowly, reaching only ${(ratio * 100).toFixed(0)}% of daily budget (${formatVND(speedMetric)} / ${formatVND(budget)}).`,
        trendText,
        trendClass,
        suggestion: lang === "vi"
          ? "Kiểm tra lại tệp đối tượng nhắm mục tiêu, tăng giá thầu hoặc đổi mới video mẫu quảng cáo."
          : "Review target audience, increase bid, or refresh video creative to improve delivery.",
      };
    } else {
      return {
        speed: "normal",
        badgeText: lang === "vi" ? "Bình thường ✅" : "Normal ✅",
        badgeClass: "bg-emerald-950/70 text-emerald-350 border border-emerald-900/60",
        explanation: lang === "vi"
          ? `Chiến dịch chi tiêu ổn định, đạt ${(ratio * 100).toFixed(0)}% ngân sách ngày (${formatVND(speedMetric)} / ${formatVND(budget)}).`
          : `Campaign is spending steadily, reaching ${(ratio * 100).toFixed(0)}% of daily budget (${formatVND(speedMetric)} / ${formatVND(budget)}).`,
        trendText,
        trendClass,
        suggestion: lang === "vi"
          ? "Tốc độ chi tiêu lý tưởng. Tiếp tục theo dõi chỉ số ROI hiệu quả."
          : "Ideal spending rate. Keep monitoring ROI for efficiency.",
      };
    }
  }

  // Infinite or other budget modes
  if (speedMetric >= 1500000) {
    return {
      speed: "fast",
      badgeText: lang === "vi" ? "Tiêu nhanh ⚡" : "Fast Spend ⚡",
      badgeClass: "bg-rose-950/70 text-rose-350 border border-rose-900/60",
      explanation: lang === "vi"
        ? `Tốc độ tiêu tiền lớn (${formatVND(speedMetric)}/ngày) với chế độ ngân sách không giới hạn.`
        : `High spend volume (${formatVND(speedMetric)}/day) under unlimited budget mode.`,
      trendText,
      trendClass,
      suggestion: lang === "vi"
        ? "Đảm bảo rằng ROI của chiến dịch luôn ở mức chấp nhận được khi chi tiêu lớn."
        : "Ensure that campaign ROI remains acceptable under high spend volume.",
    };
  } else if (speedMetric < 150000) {
    return {
      speed: "slow",
      badgeText: lang === "vi" ? "Tiêu chậm 🐢" : "Slow Spend 🐢",
      badgeClass: "bg-blue-950/70 text-blue-350 border border-blue-900/60",
      explanation: lang === "vi"
        ? `Chiến dịch tiêu thụ ngân sách thấp (${formatVND(speedMetric)}/ngày).`
        : `Campaign consumes budget slowly (${formatVND(speedMetric)}/day).`,
      trendText,
      trendClass,
      suggestion: lang === "vi"
        ? "Cân nhắc chuyển đổi mục tiêu tối ưu hoặc mở rộng quy mô nhóm đối tượng quảng cáo."
        : "Consider switching optimization goals or broadening targeting to speed up distribution.",
    };
  } else {
    return {
      speed: "normal",
      badgeText: lang === "vi" ? "Bình thường ✅" : "Normal ✅",
      badgeClass: "bg-emerald-950/70 text-emerald-350 border border-emerald-900/60",
      explanation: lang === "vi"
        ? `Tốc độ tiêu tiền ổn định (${formatVND(speedMetric)}/ngày) với chế độ ngân sách không giới hạn.`
        : `Steady spend volume (${formatVND(speedMetric)}/day) under unlimited budget mode.`,
      trendText,
      trendClass,
      suggestion: lang === "vi"
        ? "Giám sát hiệu quả định kỳ. Duy trì nội dung quảng cáo ổn định."
        : "Monitor performance periodically. Maintain stable creative content.",
    };
  }
};

interface CampaignSpendChartProps {
  reports: any[];
  budget: number;
  budgetMode: string;
  lang: "vi" | "en";
}

const CampaignSpendChart = ({ reports, budget, budgetMode, lang }: CampaignSpendChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!reports || reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 bg-[#111318]/50 rounded-lg border border-[#1F232B] text-gray-500 font-mono text-xs">
        <span>{lang === "vi" ? "Chưa có dữ liệu lịch sử tiêu tiền" : "No historical spend data available"}</span>
      </div>
    );
  }

  const maxSpend = Math.max(...reports.map((r) => r.spend), 1000);
  const width = 550;
  const height = 140;
  const padding = { top: 15, right: 15, bottom: 20, left: 15 };

  const points = reports.map((r, i) => {
    const x = padding.left + (reports.length > 1 ? (i / (reports.length - 1)) * (width - padding.left - padding.right) : 0);
    const y = height - padding.bottom - (r.spend / maxSpend) * (height - padding.top - padding.bottom);
    return { x, y, r };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
        <span>{lang === "vi" ? "Tốc độ tiêu tiền (30 phút qua)" : "Spend speed (last 30-min intervals)"}</span>
        {hoveredPoint && (
          <span className="text-cyan-400 font-bold bg-[#151922] px-2 py-0.5 rounded border border-cyan-500/20 transition-all">
            {formatDate(hoveredPoint.r.date)}: {formatVND(hoveredPoint.r.spend)}
          </span>
        )}
      </div>

      <div className="relative bg-[#0E1015]/60 rounded-lg p-3 border border-[#1F232B] shadow-inner w-full">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="spendLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding.left}
              y1={height - padding.bottom - ratio * (height - padding.top - padding.bottom)}
              x2={width - padding.right}
              y2={height - padding.bottom - ratio * (height - padding.top - padding.bottom)}
              stroke="#1F232B"
              strokeDasharray="2 4"
              strokeWidth="0.5"
            />
          ))}

          {/* Area fill */}
          {reports.length > 1 && <path d={areaD} fill="url(#spendGrad)" />}

          {/* Line path */}
          {reports.length > 1 ? (
            <path d={pathD} fill="none" stroke="url(#spendLineGrad)" strokeWidth="2" />
          ) : (
            <circle cx={points[0].x} cy={points[0].y} r="4" fill="#6366f1" />
          )}

          {/* Interactive dots */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === i ? "5" : "3.5"}
                fill={hoveredIndex === i ? "#06b6d4" : "#6366f1"}
                stroke="#08090C"
                strokeWidth={hoveredIndex === i ? "1.5" : "1"}
                className="transition-all duration-150 pointer-events-none"
              />
            </g>
          ))}

          {/* X axis labels */}
          {reports.length > 1 && (
            <>
              <text x={points[0].x} y={height - 4} fill="#4b5563" fontSize="8" fontFamily="monospace" textAnchor="start">
                {formatDate(reports[0].date)}
              </text>
              {reports.length > 2 && (
                <text x={points[Math.floor(reports.length / 2)].x} y={height - 4} fill="#4b5563" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  {formatDate(reports[Math.floor(reports.length / 2)].date)}
                </text>
              )}
              <text x={points[points.length - 1].x} y={height - 4} fill="#4b5563" fontSize="8" fontFamily="monospace" textAnchor="end">
                {formatDate(reports[reports.length - 1].date)}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
};


const translations = {
  en: {
    title: "GMV Max MH",
    subtitle: "TikTok Ads Centralized Control Room",
    allShops: "All Shops",
    syncAccounts: "Sync Accounts",
    syncing: "Syncing...",
    totalGmv: "TOTAL GMV",
    totalSpend: "TOTAL SPEND",
    averageRoi: "AVERAGE ROI",
    totalOrders: "TOTAL ORDERS",
    averageCtr: "AVERAGE CTR",
    lastUpdate: "Last update: Today 11:34:00 (Auto sync 5m)",
    // Tabs
    tabCampaigns: "Campaign Dashboard",
    tabProducts: "Product Analytics",
    tabCreatives: "Creative Performance",
    tabAlerts: "Anomaly Log",
    tabAi: "AI Recommendations",
    tabSettings: "Account Settings",
    tabDocs: "User Manual",
    // Campaigns tab
    campaignName: "Campaign Name / ID",
    status: "Status",
    spend: "Spend",
    gmv: "GMV",
    roi: "ROI",
    orders: "Orders",
    impressions: "Impressions",
    clicks: "Clicks",
    ctr: "CTR",
    convRate: "Conv. Rate",
    active: "ACTIVE",
    paused: "PAUSED",
    noCampaigns: "No campaigns synced yet. Please connect accounts and click sync.",
    // Products tab
    topProducts: "Top Products by GMV",
    worstProducts: "Worst Performing Products (Low ROI)",
    id: "ID",
    stock: "Stock",
    itemsRemaining: "items remaining",
    // Creatives tab
    topCreatives: "Top Performance Video Creatives",
    worstCreatives: "Suboptimal Creatives (Creative fatigue / Replace)",
    // Alerts tab
    anomalyLog: "Rule-based Anomaly Detections",
    noAlerts: "No anomalies logged in current session. All systems normal.",
    rule: "Rule",
    shop: "Shop",
    resolve: "Resolve",
    resolved: "Resolved",
    // AI tab
    aiEngine: "AI Engine Optimizations & Recommendations",
    noRecs: "No recommendations computed. Ensure campaign reports are loaded.",
    priority: "PRIORITY",
    action: "Action",
    applyRec: "Apply Recommendation"
  },
  vi: {
    title: "GMV Max MH",
    subtitle: "Phòng Điều Khiển Trung Tâm Quảng Cáo TikTok",
    allShops: "Tất cả cửa hàng",
    syncAccounts: "Đồng bộ tài khoản",
    syncing: "Đang đồng bộ...",
    totalGmv: "TỔNG GMV",
    totalSpend: "TỔNG CHI PHÍ",
    averageRoi: "ROI TRUNG BÌNH",
    totalOrders: "TỔNG ĐƠN HÀNG",
    averageCtr: "CTR TRUNG BÌNH",
    lastUpdate: "Cập nhật gần nhất: Hôm nay 11:34:00 (Tự động đồng bộ mỗi 5 phút)",
    // Tabs
    tabCampaigns: "Bảng Chiến Dịch",
    tabProducts: "Phân Tích Sản Phẩm",
    tabCreatives: "Hiệu Suất Video",
    tabAlerts: "Bản Ghi Bất Thường",
    tabAi: "Khuyến Nghị AI",
    tabSettings: "Cấu hình Tài khoản",
    tabDocs: "Hướng dẫn sử dụng",
    // Campaigns tab
    campaignName: "Tên chiến dịch / ID",
    status: "Trạng thái",
    spend: "Chi phí",
    gmv: "GMV",
    roi: "ROI",
    orders: "Đơn hàng",
    impressions: "Lượt hiển thị",
    clicks: "Lượt click",
    ctr: "CTR",
    convRate: "Tỷ lệ chuyển đổi",
    active: "HOẠT ĐỘNG",
    paused: "TẠM DỪNG",
    noCampaigns: "Chưa đồng bộ chiến dịch nào. Vui lòng kết nối tài khoản và nhấn đồng bộ.",
    // Products tab
    topProducts: "Top Sản Phẩm theo GMV",
    worstProducts: "Sản Phẩm Hiệu Quả Kém (ROI Thấp)",
    id: "Mã",
    stock: "Tồn kho",
    itemsRemaining: "sản phẩm còn lại",
    // Creatives tab
    topCreatives: "Top Video Hiệu Quả",
    worstCreatives: "Video Hiệu Quả Kém (Cần thay thế)",
    // Alerts tab
    anomalyLog: "Phát hiện chỉ số bất thường dựa trên quy tắc",
    noAlerts: "Không phát hiện chỉ số bất thường nào. Tất cả hệ thống hoạt động ổn định.",
    rule: "Quy tắc",
    shop: "Cửa hàng",
    resolve: "Xử lý",
    resolved: "Đã xử lý",
    // AI tab
    aiEngine: "Tối ưu hóa & Khuyến nghị từ Trí tuệ Nhân tạo",
    noRecs: "Chưa có khuyến nghị nào được tính toán. Hãy đồng bộ dữ liệu chiến dịch.",
    priority: "MỨC ĐỘ",
    action: "Hành động",
    applyRec: "Áp dụng khuyến nghị"
  }
};

export default function Dashboard() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<"en" | "vi">("vi"); // Default to Vietnamese
  const [activeTab, setActiveTab] = useState<"campaigns" | "products" | "creatives" | "alerts" | "ai" | "settings" | "docs">("campaigns");
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [tempRoiThreshold, setTempRoiThreshold] = useState("3.0");
  const [tempMinSpend, setTempMinSpend] = useState("200000");
  const [tempMaxOrders, setTempMaxOrders] = useState("20");

  // Separate Auto-relaunch states for Video and LIVE & In-house Channels
  const [relaunchConfigTab, setRelaunchConfigTab] = useState<"video" | "live" | "channels">("video");
  const [tempInhouseChannels, setTempInhouseChannels] = useState<string>("");
  const [creativeChannelFilter, setCreativeChannelFilter] = useState<"ALL" | "INHOUSE" | "AFFILIATE">("ALL");
  const [tempVideoEnabled, setTempVideoEnabled] = useState(true);
  const [tempVideoRoi, setTempVideoRoi] = useState("3.0");
  const [tempVideoMinSpend, setTempVideoMinSpend] = useState("200000");
  const [tempVideoMaxOrders, setTempVideoMaxOrders] = useState("20");
  const [tempLiveEnabled, setTempLiveEnabled] = useState(true);
  const [tempLiveRoi, setTempLiveRoi] = useState("3.0");
  const [tempLiveMinSpend, setTempLiveMinSpend] = useState("200000");
  const [tempLiveMaxOrders, setTempLiveMaxOrders] = useState("20");
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>("");
  const [isAdDropdownOpen, setIsAdDropdownOpen] = useState(false);
  const [dbAdvertisers, setDbAdvertisers] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [sendingReport, setSendingReport] = useState<boolean>(false);
  const [showHistoricalSyncModal, setShowHistoricalSyncModal] = useState<boolean>(false);
  const [historicalSyncing, setHistoricalSyncing] = useState<boolean>(false);
  const [historicalSyncStart, setHistoricalSyncStart] = useState<string>("");
  const [historicalSyncEnd, setHistoricalSyncEnd] = useState<string>("");
  const [historicalSyncResult, setHistoricalSyncResult] = useState<any>(null);
  const [historicalProgress, setHistoricalProgress] = useState<{
    current: number;
    total: number;
    currentDate: string;
    percent: number;
    logs: { date: string; success: boolean; syncedAccounts?: number; error?: string }[];
  }>({ current: 0, total: 0, currentDate: "", percent: 0, logs: [] });
  const isHistoricalSyncAbortedRef = useRef<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<string>("spend"); // Default sorting column
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // Default sorting order (low to high as requested)
  const [gmvMaxTypeFilter, setGmvMaxTypeFilter] = useState<"ALL" | "PRODUCT" | "LIVE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const getTodayString = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [startDate, setStartDate] = useState<string>(getTodayString);
  const [endDate, setEndDate] = useState<string>(getTodayString);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");
  const [campaignPage, setCampaignPage] = useState<number>(1);
  const [isRelaunchConfigOpen, setIsRelaunchConfigOpen] = useState<boolean>(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState<boolean>(false);
  const CAMPAIGNS_PER_PAGE = 10;

  // Link new account state
  const [authCodeInput, setAuthCodeInput] = useState<string>("");
  const [linkingAdShopId, setLinkingAdShopId] = useState<string>("");
  const [isLinkingAccount, setIsLinkingAccount] = useState<boolean>(false);

  // Premium custom toast/notification state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  // Custom confirmation modal state
  const [confirmDlg, setConfirmDlg] = useState<{
    message: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Campaign updates states
  const [updatingCampaigns, setUpdatingCampaigns] = useState<Record<string, boolean>>({});
  const [editingCampaignBudgetId, setEditingCampaignBudgetId] = useState<string | null>(null);
  const [tempCampaignBudget, setTempCampaignBudget] = useState<string>("");
  const [editingCampaignRoasId, setEditingCampaignRoasId] = useState<string | null>(null);
  const [tempCampaignRoas, setTempCampaignRoas] = useState<string>("");

  // Relaunch custom configuration states
  const [relaunchConfigCamp, setRelaunchConfigCamp] = useState<{ campaignId: string; alertId?: string; name: string } | null>(null);
  const [relaunchBudget, setRelaunchBudget] = useState("");
  const [relaunchRoas, setRelaunchRoas] = useState("");
  const [isLoadingRelaunchInfo, setIsLoadingRelaunchInfo] = useState(false);

  // Custom notifications helper functions
  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    setToast({ message, type });
  };

  const askConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDlg({ message, resolve });
    });
  };

  const handleCopyText = (textToCopy: string, label: string) => {
    const successMessage = lang === "vi" ? `Đã sao chép ${label}: ${textToCopy}` : `Copied ${label}: ${textToCopy}`;
    const errorMessage = lang === "vi" ? "Lỗi khi sao chép!" : "Copy failed!";

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          showToast(successMessage, "success");
        })
        .catch((err) => {
          showToast(errorMessage, "error");
          console.error("Clipboard copy error:", err);
        });
    } else {
      // Fallback method for non-secure contexts (HTTP)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          showToast(successMessage, "success");
        } else {
          showToast(errorMessage, "error");
        }
      } catch (err) {
        showToast(errorMessage, "error");
        console.error("Fallback copy error:", err);
      }
    }
  };

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Initialize AI configurations from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("gemini_api_key");
      if (savedKey) setGeminiApiKey(savedKey);
      const savedHistory = localStorage.getItem("audit_history");
      if (savedHistory) {
        try {
          setAuditHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Failed to parse audit history", e);
        }
      }
    }
  }, []);

  // Auto hide toast notifications after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // States for API data
  const [widgets, setWidgets] = useState<{
    totalSpend: number;
    totalGMV: number;
    totalOrders: number;
    averageROI: number;
    averageCTR: number;
    sources?: any;
  }>({
    totalSpend: 0,
    totalGMV: 0,
    totalOrders: 0,
    averageROI: 0,
    averageCTR: 0,
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Dynamically detect currency mode (if any campaign has daily budget > 0 and < 5000)
  const isUsdMode = React.useMemo(() => {
    return campaigns.some((c: any) => c.budget > 0 && c.budget < 5000);
  }, [campaigns]);

  // Shadow global formatVND to format dynamically based on currency mode
  const formatVND = (value: number): string => {
    if (isUsdMode) {
      return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    }
    return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + '₫';
  };

  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [productsData, setProductsData] = useState<any>({ products: [], topProducts: [], worstProducts: [] });
  const [creativesData, setCreativesData] = useState<any>({ creatives: [], topCreatives: [], worstCreatives: [] });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [relaunchingId, setRelaunchingId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [docsContent, setDocsContent] = useState<string>("");

  // Lazy-load user manual when Hướng dẫn tab is active
  useEffect(() => {
    if (activeTab === "docs" && !docsContent) {
      const fetchDocs = async () => {
        try {
          const res = await fetch("/api/docs");
          const data = await res.json();
          if (data.success) {
            setDocsContent(data.data);
          }
        } catch (e) {
          console.error("Failed to fetch user manual", e);
        }
      };
      fetchDocs();
    }
  }, [activeTab, docsContent]);

  // AI Diagnostic Workspace States
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<string>("");
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [auditStep, setAuditStep] = useState<number>(1);

  const [allAdvertisers, setAllAdvertisers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [productStockFilter, setProductStockFilter] = useState<boolean>(false);
  const [productSortBy, setProductSortBy] = useState<string>("gmv");
  const [productSortOrder, setProductSortOrder] = useState<"asc" | "desc">("desc");

  const [creativeSearchQuery, setCreativeSearchQuery] = useState<string>("");
  const [creativeSortBy, setCreativeSortBy] = useState<string>("gmv");
  const [creativeSortOrder, setCreativeSortOrder] = useState<"asc" | "desc">("desc");


  const fetchAllAdvertisers = async () => {
    try {
      const res = await fetch("/api/advertisers?all=true");
      const json = await res.json();
      if (json.success) {
        setAllAdvertisers(json.data);
      }
    } catch (e) {
      console.error("Failed to load all advertisers", e);
    }
  };

  const handleToggleAdvertiser = async (advertiserId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch("/api/advertisers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertiserId, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setAllAdvertisers((prev) =>
          prev.map((adv) => (adv.advertiserId === advertiserId ? { ...adv, status: newStatus } : adv))
        );
        fetchAdvertisers();
      }
    } catch (e) {
      console.error("Failed to toggle advertiser status", e);
    }
  };

  const handleBulkToggle = async (status: "ACTIVE" | "INACTIVE") => {
    const filteredIds = allAdvertisers
      .filter((adv) =>
        adv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adv.advertiserId.includes(searchQuery)
      )
      .map((adv) => adv.advertiserId);

    if (filteredIds.length === 0) return;

    try {
      const res = await fetch("/api/advertisers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertiserIds: filteredIds, status }),
      });
      const json = await res.json();
      if (json.success) {
        setAllAdvertisers((prev) =>
          prev.map((adv) =>
            filteredIds.includes(adv.advertiserId) ? { ...adv, status } : adv
          )
        );
        fetchAdvertisers();
      }
    } catch (e) {
      console.error("Failed to bulk toggle advertiser status", e);
    }
  };

  // States for Shop Management
  const [newShopName, setNewShopName] = useState("");
  const [newShopTiktokId, setNewShopTiktokId] = useState("");
  const [newShopRoi, setNewShopRoi] = useState("3.0");
  const [newShopMinSpend, setNewShopMinSpend] = useState("200000");
  const [newShopMaxOrders, setNewShopMaxOrders] = useState("20");
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState("");
  const [editingShopRoi, setEditingShopRoi] = useState("3.0");
  const [editingShopMinSpend, setEditingShopMinSpend] = useState("200000");
  const [editingShopMaxOrders, setEditingShopMaxOrders] = useState("20");

  const [editingShopVideoEnabled, setEditingShopVideoEnabled] = useState(true);
  const [editingShopVideoRoi, setEditingShopVideoRoi] = useState("3.0");
  const [editingShopVideoMinSpend, setEditingShopVideoMinSpend] = useState("200000");
  const [editingShopVideoMaxOrders, setEditingShopVideoMaxOrders] = useState("20");

  const [editingShopLiveEnabled, setEditingShopLiveEnabled] = useState(true);
  const [editingShopLiveRoi, setEditingShopLiveRoi] = useState("3.0");
  const [editingShopLiveMinSpend, setEditingShopLiveMinSpend] = useState("200000");
  const [editingShopLiveMaxOrders, setEditingShopLiveMaxOrders] = useState("20");

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !newShopTiktokId.trim()) return;
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newShopName,
          tiktokShopId: newShopTiktokId,
          autoRelaunchRoiThreshold: parseFloat(newShopRoi),
          autoRelaunchMinSpend: parseFloat(newShopMinSpend),
          autoRelaunchMaxOrders: parseInt(newShopMaxOrders)
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewShopName("");
        setNewShopTiktokId("");
        setNewShopRoi("3.0");
        setNewShopMinSpend("200000");
        setNewShopMaxOrders("20");
        fetchShops();
        showToast(lang === "vi" ? "Thêm cửa hàng thành công!" : "Shop added successfully!", "success");
      } else {
        showToast(json.error || "Failed to add shop", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error adding shop", "error");
    }
  };

  // Gemini AI Diagnostic Workspace handlers
  const handleRunAiAudit = async () => {
    if (!selectedShop) {
      showToast(lang === "vi" ? "Vui lòng chọn một Cửa hàng để phân tích!" : "Please select a Shop to analyze!", "warning");
      return;
    }

    setIsAuditing(true);
    setAuditReport("");
    setAuditStep(1);

    // Dynamic step progress mock to keep the UI engaging
    const stepInterval = setInterval(() => {
      setAuditStep((prev) => {
        if (prev < 4) return prev + 1;
        return prev;
      });
    }, 4000);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop,
          geminiApiKey: geminiApiKey.trim() || undefined,
        }),
      });

      const json = await response.json();
      clearInterval(stepInterval);

      if (json.success && json.data?.auditReport) {
        const reportText = json.data.auditReport;
        setAuditReport(reportText);

        const currentShopName = shops.find((s) => s.id === selectedShop)?.name || "Shop";
        const newAudit = {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
          shopId: selectedShop,
          shopName: currentShopName,
          report: reportText,
        };

        const updatedHistory = [newAudit, ...auditHistory].slice(0, 10);
        setAuditHistory(updatedHistory);
        localStorage.setItem("audit_history", JSON.stringify(updatedHistory));

        showToast(lang === "vi" ? "Phân tích AI thành công!" : "AI Analysis completed successfully!", "success");
      } else {
        showToast(json.error || (lang === "vi" ? "Gặp lỗi khi phân tích AI!" : "Error running AI analysis!"), "error");
      }
    } catch (error: any) {
      clearInterval(stepInterval);
      console.error(error);
      showToast(error.message || "Network Error", "error");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem("gemini_api_key", key);
    showToast(lang === "vi" ? "Đã lưu Gemini API Key!" : "Gemini API Key saved!", "success");
  };

  const handleDeleteAudit = (auditId: string) => {
    const updated = auditHistory.filter((item) => item.id !== auditId);
    setAuditHistory(updated);
    localStorage.setItem("audit_history", JSON.stringify(updated));
    const toDeleteReport = auditHistory.find((item) => item.id === auditId)?.report;
    if (auditReport && toDeleteReport === auditReport) {
      setAuditReport("");
    }
    showToast(lang === "vi" ? "Đã xóa bản ghi phân tích!" : "Audit report deleted!", "success");
  };

  // Lightweight, robust markdown + table renderer to match dark premium styling
  const renderMarkdown = (md: string) => {
    if (!md) return null;
    const lines = md.split("\n");
    const renderedElements: JSX.Element[] = [];

    const isLight = theme === "light";

    let currentList: string[] = [];
    let currentTableHeaders: string[] = [];
    let currentTableRows: string[][] = [];
    let inTable = false;

    let inCodeBlock = false;
    let codeBlockLines: string[] = [];

    const flushList = (key: string) => {
      if (currentList.length > 0) {
        renderedElements.push(
          <ul key={`ul-${key}`} className={`list-disc pl-5 my-3 space-y-1.5 text-xs font-sans ${isLight ? "text-gray-700" : "text-gray-200"}`}>
            {currentList.map((item, idx) => (
              <li key={`li-${key}-${idx}`} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushTable = (key: string) => {
      if (currentTableHeaders.length > 0 || currentTableRows.length > 0) {
        renderedElements.push(
          <div key={`table-wrapper-${key}`} className={`overflow-x-auto w-full my-4 border rounded-lg shadow-inner ${isLight ? "border-gray-200 bg-gray-50" : "border-[#1F232B] bg-[#111318]"}`}>
            <table className="min-w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className={`${isLight ? "bg-gray-100 text-indigo-700 border-b border-gray-200" : "bg-[#191C25] text-indigo-400 border-b border-[#2D313F]"}`}>
                  {currentTableHeaders.map((h, idx) => (
                    <th key={`th-${idx}`} className="px-4 py-2.5 font-semibold text-[11px] tracking-wider uppercase font-mono">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? "divide-gray-200" : "divide-[#1E232F]"}`}>
                {currentTableRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className={`transition-colors ${isLight ? "hover:bg-gray-200/50" : "hover:bg-[#1C202B]/45"}`}>
                    {row.map((cell, cIdx) => (
                      <td key={`cell-${rIdx}-${cIdx}`} className={`px-4 py-2.5 font-sans ${isLight ? "text-gray-800" : "text-gray-200"}`} dangerouslySetInnerHTML={{ __html: cell }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTableHeaders = [];
        currentTableRows = [];
        inTable = false;
      }
    };

    const formatText = (text: string): string => {
      let formatted = text;
      // Bold **text**
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Italic *text*
      formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
      // Inline code `code`
      formatted = formatted.replace(/`(.*?)`/g, isLight 
        ? "<code class='bg-gray-100 text-indigo-600 font-mono text-[11px] px-1.5 py-0.5 rounded border border-gray-200'>$1</code>"
        : "<code class='bg-[#222733] text-indigo-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-[#2D3243]/40'>$1</code>"
      );
      return formatted;
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const line = rawLine.trim();

      // Check code block boundary
      if (line.startsWith("```")) {
        flushList(`list-${i}`);
        flushTable(`table-${i}`);
        if (inCodeBlock) {
          const codeText = codeBlockLines.join("\n");
          renderedElements.push(
            <pre key={`code-${i}`} className={`p-4 my-3 rounded-lg font-mono text-[11px] overflow-x-auto border ${
              isLight 
                ? "bg-gray-50 border-gray-200 text-gray-800" 
                : "bg-[#0E1015]/60 border-[#1F232B] text-indigo-300"
            }`}>
              <code>{codeText}</code>
            </pre>
          );
          inCodeBlock = false;
          codeBlockLines = [];
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(rawLine);
        continue;
      }

      // Check for Table Row
      if (line.startsWith("|") && line.endsWith("|")) {
        flushList(`list-${i}`);
        
        // Check if it's table divider row (e.g., |---| or | :--- |)
        const isDivider = line.replace(/[\s|:-]/g, "").length === 0;
        if (isDivider) {
          inTable = true;
          continue;
        }

        const cells = line.split("|").slice(1, -1).map(c => formatText(c.trim()));
        if (!inTable) {
          currentTableHeaders = cells;
          inTable = true;
        } else {
          if (currentTableHeaders.length === 0) {
            currentTableHeaders = cells;
          } else {
            currentTableRows.push(cells);
          }
        }
        continue;
      } else if (inTable) {
        flushTable(`table-${i}`);
      }

      // Check headers
      if (line.startsWith("### ")) {
        flushList(`list-${i}`);
        renderedElements.push(
          <h4 key={`h4-${i}`} className={`text-xs font-bold mt-5 mb-2.5 tracking-wider uppercase font-mono flex items-center gap-1.5 border-l-2 pl-2 ${isLight ? "text-indigo-600 border-indigo-600" : "text-indigo-400 border-indigo-500"}`}>
            {line.substring(4)}
          </h4>
        );
      } else if (line.startsWith("## ")) {
        flushList(`list-${i}`);
        renderedElements.push(
          <h3 key={`h3-${i}`} className={`text-sm font-bold mt-6 mb-3 border-b pb-2 flex items-center gap-2 ${isLight ? "text-gray-900 border-gray-200" : "text-white border-[#212635]"}`}>
            {line.substring(3)}
          </h3>
        );
      } else if (line.startsWith("# ")) {
        flushList(`list-${i}`);
        renderedElements.push(
          <h2 key={`h2-${i}`} className={`text-base font-extrabold mt-8 mb-4 border-b pb-2.5 flex items-center gap-2 ${isLight ? "text-gray-900 border-gray-200" : "text-white border-[#2C3243]"}`}>
            {line.substring(2)}
          </h2>
        );
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        currentList.push(formatText(line.substring(2)));
      } else if (line === "") {
        flushList(`list-${i}`);
      } else {
        flushList(`list-${i}`);
        renderedElements.push(
          <p key={`p-${i}`} className={`text-xs my-2 leading-relaxed font-sans ${isLight ? "text-gray-700" : "text-gray-200"}`} dangerouslySetInnerHTML={{ __html: formatText(line) }} />
        );
      }
    }

    flushList("end");
    flushTable("end");
    return renderedElements;
  };

  const handleLinkNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCodeInput.trim()) {
      showToast(lang === "vi" ? "Vui lòng nhập Auth Code!" : "Please enter the Auth Code!", "warning");
      return;
    }
    
    // Default to first shop if none selected
    let shopIdToUse = linkingAdShopId;
    if (!shopIdToUse && shops.length > 0) {
      shopIdToUse = shops[0].id;
    }
    
    if (!shopIdToUse) {
      showToast(lang === "vi" ? "Vui lòng thêm Cửa hàng trước!" : "Please add a Shop first!", "warning");
      return;
    }

    setIsLinkingAccount(true);
    try {
      const res = await fetch("/api/advertisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authCode: authCodeInput.trim(),
          shopId: shopIdToUse,
        }),
      });
      
      const json = await res.json();
      if (json.success) {
        setAuthCodeInput("");
        showToast(
          lang === "vi" 
            ? `Kết nối thành công ${json.data.linkedAccounts.length} tài khoản quảng cáo!` 
            : `Successfully connected ${json.data.linkedAccounts.length} ad accounts!`, 
          "success"
        );
        // Refresh advertiser lists
        fetchAllAdvertisers();
        fetchAdvertisers();
      } else {
        showToast(json.error || "Failed to link accounts", "error");
      }
    } catch (err: any) {
      console.error("Link account error:", err);
      showToast(lang === "vi" ? "Lỗi kết nối tài khoản!" : "Failed to link accounts!", "error");
    } finally {
      setIsLinkingAccount(false);
    }
  };

  const handleRenameShop = async (shopId: string) => {
    if (!editingShopName.trim()) return;
    try {
      const res = await fetch("/api/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: shopId,
          name: editingShopName,
          autoRelaunchRoiThreshold: parseFloat(editingShopVideoRoi || editingShopRoi),
          autoRelaunchMinSpend: parseFloat(editingShopVideoMinSpend || editingShopMinSpend),
          autoRelaunchMaxOrders: parseInt(editingShopVideoMaxOrders || editingShopMaxOrders),
          autoRelaunchVideoEnabled: editingShopVideoEnabled,
          autoRelaunchVideoRoi: parseFloat(editingShopVideoRoi || editingShopRoi),
          autoRelaunchVideoMinSpend: parseFloat(editingShopVideoMinSpend || editingShopMinSpend),
          autoRelaunchVideoMaxOrders: parseInt(editingShopVideoMaxOrders || editingShopMaxOrders),
          autoRelaunchLiveEnabled: editingShopLiveEnabled,
          autoRelaunchLiveRoi: parseFloat(editingShopLiveRoi || editingShopRoi),
          autoRelaunchLiveMinSpend: parseFloat(editingShopLiveMinSpend || editingShopMinSpend),
          autoRelaunchLiveMaxOrders: parseInt(editingShopLiveMaxOrders || editingShopMaxOrders),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingShopId(null);
        setEditingShopName("");
        setEditingShopRoi("3.0");
        setEditingShopMinSpend("200000");
        setEditingShopMaxOrders("20");
        fetchShops();
        if (selectedShop === shopId) {
          fetchAdvertisers();
          fetchData();
        }
        showToast(lang === "vi" ? "Cập nhật cửa hàng thành công!" : "Shop updated successfully!", "success");
      } else {
        showToast(json.error || "Failed to update shop", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    const confirmMsg = lang === "vi"
      ? "Bạn có chắc chắn muốn xóa cửa hàng này? Tất cả liên kết và dữ liệu liên quan sẽ bị xóa."
      : "Are you sure you want to delete this shop? All linked advertisers and data will be removed.";
    
    const isConfirmed = await askConfirm(confirmMsg);
    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/shops", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shopId }),
      });
      const json = await res.json();
      if (json.success) {
        if (selectedShop === shopId) {
          setSelectedShop("");
        }
        fetchShops();
        showToast(lang === "vi" ? "Xóa cửa hàng thành công!" : "Shop deleted successfully!", "success");
      } else {
        showToast(json.error || "Failed to delete shop", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkAdvertiserToShop = async (advertiserId: string, shopId: string) => {
    try {
      const res = await fetch("/api/advertisers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertiserId, shopId }),
      });
      const json = await res.json();
      if (json.success) {
        setAllAdvertisers((prev) =>
          prev.map((adv) => (adv.advertiserId === advertiserId ? { ...adv, shopId } : adv))
        );
        fetchAdvertisers();
        fetchData();
        showToast(lang === "vi" ? "Liên kết tài khoản quảng cáo thành công!" : "Linked advertiser account successfully!", "success");
      } else {
        showToast(json.error || "Failed to link ad account to shop", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "settings") {
      fetchAllAdvertisers();
    }
  }, [activeTab]);

  // Fetch all advertisers in the database for selection dropdown
  const fetchAdvertisers = async () => {
    try {
      const shopParam = selectedShop ? `?shopId=${selectedShop}` : "";
      const res = await fetch(`/api/advertisers${shopParam}`);
      const json = await res.json();
      if (json.success) {
        setDbAdvertisers(json.data);
      }
    } catch (e) {
      console.error("Failed to load advertisers list", e);
    }
  };

  // Filter and sort campaigns
  const filteredCampaigns = React.useMemo(() => {
    let list = campaigns;
    if (selectedAdvertiser) {
      list = list.filter((c) => c.advertiserName === selectedAdvertiser);
    }
    if (gmvMaxTypeFilter !== "ALL") {
      list = list.filter((c) => c.shoppingAdsType === gmvMaxTypeFilter);
    }
    if (statusFilter === "ACTIVE") {
      list = list.filter((c) => c.status === "CAMPAIGN_STATUS_ENABLE");
    } else if (statusFilter === "PAUSED") {
      list = list.filter((c) => c.status !== "CAMPAIGN_STATUS_ENABLE");
    }
    
    return [...list].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal || "").toLowerCase();
      const bStr = String(bVal || "").toLowerCase();
      return sortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [campaigns, selectedAdvertiser, gmvMaxTypeFilter, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalCampaignPages = Math.max(1, Math.ceil(filteredCampaigns.length / CAMPAIGNS_PER_PAGE));
  const paginatedCampaigns = React.useMemo(() => {
    const start = (campaignPage - 1) * CAMPAIGNS_PER_PAGE;
    return filteredCampaigns.slice(start, start + CAMPAIGNS_PER_PAGE);
  }, [filteredCampaigns, campaignPage]);

  // Reset page when filters change
  React.useEffect(() => {
    setCampaignPage(1);
  }, [selectedAdvertiser, gmvMaxTypeFilter, statusFilter, sortBy, sortOrder, campaigns]);

  // Dynamically calculate widgets for selected advertiser
  const activeWidgets = React.useMemo(() => {
    if (!selectedAdvertiser && gmvMaxTypeFilter === "ALL" && statusFilter === "ALL") {
      return widgets;
    }
    let totalSpend = 0;
    let totalGMV = 0;
    let totalOrders = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    
    filteredCampaigns.forEach((c) => {
      totalSpend += c.spend || 0;
      totalGMV += c.gmv || 0;
      totalOrders += c.orders || 0;
      totalImpressions += c.impressions || 0;
      totalClicks += c.clicks || 0;
    });
    
    return {
      totalSpend,
      totalGMV,
      totalOrders,
      averageROI: totalSpend > 0 ? totalGMV / totalSpend : 0,
      averageCTR: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      sources: (widgets as any)?.sources,
    };
  }, [widgets, selectedAdvertiser, gmvMaxTypeFilter, statusFilter, filteredCampaigns]);

  // Filter and sort creatives
  const filteredCreatives = React.useMemo(() => {
    let list = creativesData.creatives || [];

    // Filter by selected advertiser if set
    if (selectedAdvertiser) {
      list = list.filter((c: any) => c.advertiserName === selectedAdvertiser);
    }

    // Filter by channel type (INHOUSE or AFFILIATE)
    if (creativeChannelFilter !== "ALL") {
      list = list.filter((c: any) => (c.channelType || "AFFILIATE") === creativeChannelFilter);
    }

    // Filter by search query (name or videoId)
    if (creativeSearchQuery.trim()) {
      const q = creativeSearchQuery.toLowerCase();
      list = list.filter((c: any) => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.videoId && c.videoId.toLowerCase().includes(q)) ||
        (c.authorUsername && c.authorUsername.toLowerCase().includes(q))
      );
    }

    // Sort creatives
    return [...list].sort((a: any, b: any) => {
      let aVal = a[creativeSortBy];
      let bVal = b[creativeSortBy];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return creativeSortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal || "").toLowerCase();
      const bStr = String(bVal || "").toLowerCase();
      return creativeSortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [creativesData, selectedAdvertiser, creativeSearchQuery, creativeSortBy, creativeSortOrder]);

  // Compute creative summary metrics
  const creativeMetrics = React.useMemo(() => {
    const list = filteredCreatives;
    if (list.length === 0) {
      return {
        topViralVideo: null as any,
        worstVideo: null as any,
        totalSpend: 0,
        totalGmv: 0,
        averageRoi: 0,
        averageCtr: 0,
        count: 0
      };
    }

    let totalSpend = 0;
    let totalGmv = 0;
    let totalCtrSum = 0;
    let countWithCtr = 0;

    let topViralVideo = list[0];
    let worstVideo: any = null;
    let minRoi = Infinity;

    list.forEach((c: any) => {
      totalSpend += c.spend || 0;
      totalGmv += c.gmv || 0;
      if (c.ctr !== undefined) {
        totalCtrSum += c.ctr;
        countWithCtr++;
      }

      if (c.gmv > (topViralVideo?.gmv || 0)) {
        topViralVideo = c;
      }

      if (c.spend > 0) {
        const roi = c.roi;
        if (roi < minRoi) {
          minRoi = roi;
          worstVideo = c;
        }
      }
    });

    return {
      topViralVideo,
      worstVideo,
      totalSpend: totalSpend,
      totalGmv: totalGmv,
      averageRoi: totalSpend > 0 ? totalGmv / totalSpend : 0,
      averageCtr: countWithCtr > 0 ? totalCtrSum / countWithCtr : 0,
      count: list.length
    };
  }, [filteredCreatives]);


  // Filter and sort products
  const filteredProducts = React.useMemo(() => {
    let list = productsData.products || [];

    // Filter by search query (name or sku)
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      list = list.filter((p: any) => 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.productId && p.productId.toLowerCase().includes(q)) || 
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    // Filter by stock level (low stock threshold < 10)
    if (productStockFilter) {
      list = list.filter((p: any) => p.stock < 10);
    }

    // Sort products
    return [...list].sort((a: any, b: any) => {
      let aVal = a[productSortBy];
      let bVal = b[productSortBy];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return productSortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal || "").toLowerCase();
      const bStr = String(bVal || "").toLowerCase();
      return productSortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [productsData.products, productSearchQuery, productStockFilter, productSortBy, productSortOrder]);

  // Compute product dashboard KPI cards
  const productMetrics = React.useMemo(() => {
    const list = productsData.products || [];
    
    // Find Hero Product (highest GMV)
    let heroProduct: any = null;
    if (list.length > 0) {
      heroProduct = list.reduce((max: any, p: any) => ((p.gmv || 0) > (max?.gmv || 0) ? p : max), list[0]);
    }
    
    // Find Underperforming Product (lowest ROI with spend > 0)
    const productsWithSpend = list.filter((p: any) => (p.spend || 0) > 0);
    let worstProduct: any = null;
    if (productsWithSpend.length > 0) {
      worstProduct = productsWithSpend.reduce((min: any, p: any) => ((p.roi || 0) < (min?.roi || Infinity) ? p : min), productsWithSpend[0]);
    }

    // Count low stock items (stock < 10)
    const lowStockCount = list.filter((p: any) => (p.stock || 0) < 10).length;

    return { heroProduct, worstProduct, lowStockCount };
  }, [productsData.products]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // T: translation helper
  const t = translations[lang];

  // Shops list loaded dynamically
  const [shops, setShops] = useState<any[]>([]);

  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops");
      const json = await res.json();
      if (json.success) {
        setShops(json.data);
        if (json.data.length > 0 && !linkingAdShopId) {
          setLinkingAdShopId(json.data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load shops list", e);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // Synchronize temp parameters when selected shop or shops list updates
  useEffect(() => {
    if (selectedShop) {
      const currentShop = shops.find((s) => s.id === selectedShop);
      if (currentShop) {
        setTempRoiThreshold(currentShop.autoRelaunchRoiThreshold.toString());
        setTempMinSpend((currentShop.autoRelaunchMinSpend ?? 200000).toString());
        setTempMaxOrders((currentShop.autoRelaunchMaxOrders ?? 20).toString());

        setTempVideoEnabled(currentShop.autoRelaunchVideoEnabled ?? true);
        setTempVideoRoi((currentShop.autoRelaunchVideoRoi ?? currentShop.autoRelaunchRoiThreshold ?? 3.0).toString());
        setTempVideoMinSpend((currentShop.autoRelaunchVideoMinSpend ?? currentShop.autoRelaunchMinSpend ?? 200000).toString());
        setTempVideoMaxOrders((currentShop.autoRelaunchVideoMaxOrders ?? currentShop.autoRelaunchMaxOrders ?? 20).toString());

        setTempLiveEnabled(currentShop.autoRelaunchLiveEnabled ?? true);
        setTempLiveRoi((currentShop.autoRelaunchLiveRoi ?? currentShop.autoRelaunchRoiThreshold ?? 3.0).toString());
        setTempLiveMinSpend((currentShop.autoRelaunchLiveMinSpend ?? currentShop.autoRelaunchMinSpend ?? 200000).toString());
        setTempLiveMaxOrders((currentShop.autoRelaunchLiveMaxOrders ?? currentShop.autoRelaunchMaxOrders ?? 20).toString());
        setTempInhouseChannels(currentShop.inhouseChannels || "");
      }
    } else {
      setTempRoiThreshold("3.0");
      setTempMinSpend("200000");
      setTempMaxOrders("20");

      setTempVideoEnabled(true);
      setTempVideoRoi("3.0");
      setTempVideoMinSpend("200000");
      setTempVideoMaxOrders("20");

      setTempLiveEnabled(true);
      setTempLiveRoi("3.0");
      setTempLiveMinSpend("200000");
      setTempLiveMaxOrders("20");
      setTempInhouseChannels("");
    }
  }, [selectedShop, shops]);

  const handleSaveRoiThreshold = async () => {
    if (!selectedShop) return;
    const vRoi = parseFloat(tempVideoRoi);
    const vSpend = parseFloat(tempVideoMinSpend);
    const vOrders = parseInt(tempVideoMaxOrders);

    const lRoi = parseFloat(tempLiveRoi);
    const lSpend = parseFloat(tempLiveMinSpend);
    const lOrders = parseInt(tempLiveMaxOrders);

    if (isNaN(vRoi) || vRoi <= 0 || isNaN(lRoi) || lRoi <= 0) {
      showToast(lang === "vi" ? "Mức ROI không hợp lệ!" : "Invalid ROI threshold!", "error");
      return;
    }
    if (isNaN(vSpend) || vSpend < 0 || isNaN(lSpend) || lSpend < 0) {
      showToast(lang === "vi" ? "Mức chi tiêu tối thiểu không hợp lệ!" : "Invalid spend limit!", "error");
      return;
    }
    if (isNaN(vOrders) || vOrders < 0 || isNaN(lOrders) || lOrders < 0) {
      showToast(lang === "vi" ? "Số lượng đơn hàng tối đa không hợp lệ!" : "Invalid max orders!", "error");
      return;
    }

    try {
      const res = await fetch("/api/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedShop,
          autoRelaunchRoiThreshold: vRoi,
          autoRelaunchMinSpend: vSpend,
          autoRelaunchMaxOrders: vOrders,
          autoRelaunchVideoEnabled: tempVideoEnabled,
          autoRelaunchVideoRoi: vRoi,
          autoRelaunchVideoMinSpend: vSpend,
          autoRelaunchVideoMaxOrders: vOrders,
          autoRelaunchLiveEnabled: tempLiveEnabled,
          autoRelaunchLiveRoi: lRoi,
          autoRelaunchLiveMinSpend: lSpend,
          autoRelaunchLiveMaxOrders: lOrders,
          inhouseChannels: tempInhouseChannels,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          lang === "vi"
            ? `Cấu hình tự động lên camp & Kênh In-house đã được cập nhật thành công!`
            : `Auto-relaunch conditions & In-house channels updated successfully!`,
          "success"
        );
        fetchShops();
      } else {
        showToast(`Save failed: ${json.error}`, "error");
      }
    } catch (e: any) {
      showToast("Could not save settings.", "error");
    }
  };

  const handleToggleCreativeChannel = async (creativeId: string, currentType: string) => {
    const nextType = currentType === "INHOUSE" ? "AFFILIATE" : "INHOUSE";
    try {
      const res = await fetch("/api/creatives", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: creativeId, channelType: nextType }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          lang === "vi" 
            ? `Đã chuyển video sang: ${nextType === "INHOUSE" ? "🏢 In-house (Kênh nhà)" : "✨ Affiliate (KOC)"}` 
            : `Updated to: ${nextType}`, 
          "success"
        );
        setCreativesData((prev: any) => ({
          ...prev,
          creatives: (prev.creatives || []).map((c: any) => c.id === creativeId ? { ...c, channelType: nextType } : c)
        }));
        // Reload dashboard silently to update source widgets immediately
        fetchData(startDate, endDate, true);
      }
    } catch (e) {
      showToast(lang === "vi" ? "Lỗi cập nhật phân loại video" : "Failed to update creative", "error");
    }
  };

  // Fetch Dashboard Metrics
  const fetchData = async (sDate?: string, eDate?: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const activeStartDate = sDate !== undefined ? sDate : startDate;
      const activeEndDate = eDate !== undefined ? eDate : endDate;

      // Build shared params with optional date filter
      const baseParams = new URLSearchParams();
      if (selectedShop) baseParams.set("shopId", selectedShop);
      if (activeStartDate) baseParams.set("startDate", activeStartDate);
      if (activeEndDate) baseParams.set("endDate", activeEndDate);
      const dateParam = baseParams.toString() ? `?${baseParams.toString()}` : "";

      // Shop-only param for APIs that don't need date filtering
      const shopOnlyParams = new URLSearchParams();
      if (selectedShop) shopOnlyParams.set("shopId", selectedShop);
      const shopParam = shopOnlyParams.toString() ? `?${shopOnlyParams.toString()}` : "";

      // Phase 1: Load critical data first (fast — DB queries only)
      const [dashRes, campRes, prodRes, creatRes, alertRes] = await Promise.all([
        fetch(`/api/dashboard${dateParam}`),
        fetch(`/api/campaigns${dateParam}`),
        fetch(`/api/products${shopParam}`),
        fetch(`/api/creatives${shopParam}`),
        fetch(`/api/alerts`),
      ]);

      const [dash, camp, prod, creat, alert] = await Promise.all([
        dashRes.json(),
        campRes.json(),
        prodRes.json(),
        creatRes.json(),
        alertRes.json(),
      ]);

      if (dash.success) setWidgets(dash.data.widgets);
      if (camp.success) setCampaigns(camp.data);
      if (prod.success) setProductsData(prod.data);
      if (creat.success) setCreativesData(creat.data);
      if (alert.success) setAlerts(alert.data);
      setLastUpdatedTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      console.error("Failed to load dashboard metrics", e);
    } finally {
      setLoading(false);
    }

    // Phase 2: Load AI recommendations lazily in background (heavier — doesn't block UI)
    if (selectedShop) {
      const shopOnlyParams = new URLSearchParams();
      shopOnlyParams.set("shopId", selectedShop);
      try {
        const aiRes = await fetch(`/api/ai?${shopOnlyParams.toString()}`);
        const ai = await aiRes.json();
        if (ai.success) setRecommendations(ai.data);
      } catch (e) {
        console.error("Failed to load AI recommendations", e);
      }
    }
  };

  // Re-fetch dashboard + campaigns when report date range changes
  const fetchDataForRange = async (sDate: string, eDate: string) => {
    try {
      const baseParams = new URLSearchParams();
      if (selectedShop) baseParams.set("shopId", selectedShop);
      if (sDate) baseParams.set("startDate", sDate);
      if (eDate) baseParams.set("endDate", eDate);
      const dateParam = baseParams.toString() ? `?${baseParams.toString()}` : "";

      const [dashRes, campRes] = await Promise.all([
        fetch(`/api/dashboard${dateParam}`),
        fetch(`/api/campaigns${dateParam}`),
      ]);
      const [dash, camp] = await Promise.all([dashRes.json(), campRes.json()]);
      if (dash.success) setWidgets(dash.data.widgets);
      if (camp.success) {
        setCampaigns(camp.data);
        setCampaignPage(1);
      }
    } catch (e) {
      console.error("Failed to load data for range", e);
    }
  };

  const handleSingleDateSelect = (val: string) => {
    setStartDate(val);
    setEndDate(val);
    fetchDataForRange(val, val);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    fetchDataForRange(val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    fetchDataForRange(startDate, val);
  };

  const handleQuickDateSelect = (type: "today" | "yesterday") => {
    if (type === "today") {
      const today = getTodayString();
      setStartDate(today);
      setEndDate(today);
      fetchDataForRange(today, today);
    } else if (type === "yesterday") {
      const yesterday = getYesterdayString();
      setStartDate(yesterday);
      setEndDate(yesterday);
      fetchDataForRange(yesterday, yesterday);
    }
  };

  useEffect(() => {
    setSelectedAdvertiser("");
    fetchAdvertisers();
    fetchData(startDate, endDate);
  }, [selectedShop]);

  // Tự động làm mới dữ liệu ngầm cho ngày hôm nay (chỉ chạy khi xem ngày hôm nay và tab đang mở)
  useEffect(() => {
    const today = getTodayString();
    const isViewingToday = !endDate || endDate === today;
    if (!isViewingToday) {
      return; // Không tự động refresh liên tục khi đang xem dữ liệu quá khứ
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchData(startDate, endDate, true);
    }, 60000); // 60 giây
    return () => clearInterval(interval);
  }, [selectedShop, startDate, endDate]);

  // Sync handler
  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: startDate || undefined }),
      });
      const res = await response.json();
      if (res.success) {
        if (res.data.syncedAccounts > 0) {
          showToast(lang === "vi" ? `Đồng bộ thành công! Đã cập nhật ${res.data.syncedAccounts} tài khoản.` : `Sync successful! Updated ${res.data.syncedAccounts} accounts.`, "success");
        } else if (res.data.errors && res.data.errors.length > 0) {
          showToast(lang === "vi" ? `Đồng bộ không thành công: ${res.data.errors[0].message}` : `Sync failed: ${res.data.errors[0].message}`, "error");
        } else {
          showToast(lang === "vi" ? `Đã đồng bộ xong (0 tài khoản hoạt động)` : `Sync complete (0 active accounts)`, "info");
        }
        fetchData();
      } else {
        showToast(`Sync failed: ${JSON.stringify(res.error)}`, "error");
      }
    } catch (err) {
      showToast("API sync endpoint not responding.", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Historical data recovery handler with real-time day-by-day progress tracking
  const handleHistoricalSync = async () => {
    if (!historicalSyncStart || !historicalSyncEnd) {
      showToast(lang === "vi" ? "Vui lòng chọn khoảng ngày cần khôi phục!" : "Please select a date range to recover!", "error");
      return;
    }

    const start = new Date(historicalSyncStart);
    const end = new Date(historicalSyncEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      showToast(lang === "vi" ? "Khoảng ngày không hợp lệ!" : "Invalid date range!", "error");
      return;
    }

    // Build list of dates
    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
      cursor.setDate(cursor.getDate() + 1);
    }

    setHistoricalSyncing(true);
    setHistoricalSyncResult(null);
    isHistoricalSyncAbortedRef.current = false;

    setHistoricalProgress({
      current: 0,
      total: dates.length,
      currentDate: dates[0] || "",
      percent: 0,
      logs: [],
    });

    const results: { date: string; success: boolean; syncedAccounts?: number; error?: string }[] = [];

    for (let i = 0; i < dates.length; i++) {
      if (isHistoricalSyncAbortedRef.current) {
        showToast(lang === "vi" ? "Đã dừng tiến trình khôi phục!" : "Recovery process stopped!", "info");
        break;
      }

      const dStr = dates[i];
      setHistoricalProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentDate: dStr,
        percent: Math.round(((i) / dates.length) * 100),
      }));

      try {
        const response = await fetch("/api/sync/historical", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dStr }),
        });
        const res = await response.json();
        const success = res.success;
        const syncedAccounts = res.data?.results?.[0]?.syncedAccounts || 0;
        const errorMsg = res.error || (res.data?.results?.[0]?.errors?.length ? "API Error" : undefined);

        const logEntry = {
          date: dStr,
          success,
          syncedAccounts,
          error: errorMsg,
        };
        results.push(logEntry);

        setHistoricalProgress((prev) => ({
          ...prev,
          current: i + 1,
          percent: Math.round(((i + 1) / dates.length) * 100),
          logs: [logEntry, ...prev.logs],
        }));
      } catch (err: any) {
        const logEntry = {
          date: dStr,
          success: false,
          error: err.message || "Network Error",
        };
        results.push(logEntry);

        setHistoricalProgress((prev) => ({
          ...prev,
          current: i + 1,
          percent: Math.round(((i + 1) / dates.length) * 100),
          logs: [logEntry, ...prev.logs],
        }));
      }
    }

    const successDays = results.filter((r) => r.success).length;
    const failedDays = results.filter((r) => !r.success).length;

    setHistoricalSyncResult({
      totalDays: results.length,
      successDays,
      failedDays,
      results,
    });

    setHistoricalSyncing(false);

    if (successDays > 0) {
      showToast(
        lang === "vi"
          ? `Khôi phục thành công ${successDays}/${results.length} ngày!`
          : `Recovered ${successDays}/${results.length} days successfully!`,
        "success"
      );
      fetchData();
    }
  };

  const handleStopHistoricalSync = () => {
    isHistoricalSyncAbortedRef.current = true;
  };

  // Send Telegram Report handler
  const handleSendTelegramReport = async () => {
    setSendingReport(true);
    try {
      const response = await fetch("/api/reports/telegram", { method: "POST" });
      const res = await response.json();
      if (res.success) {
        showToast(lang === "vi" ? "Gửi báo cáo qua Telegram thành công!" : "Report sent to Telegram successfully!", "success");
      } else {
        showToast(lang === "vi" ? `Gửi báo cáo thất bại: ${res.error}` : `Failed to send report: ${res.error}`, "error");
      }
    } catch (err) {
      showToast("API telegram report endpoint not responding.", "error");
    } finally {
      setSendingReport(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (response.ok) {
        window.location.href = "/login";
      } else {
        showToast(lang === "vi" ? "Đăng xuất thất bại!" : "Logout failed!", "error");
      }
    } catch (err) {
      console.error("Logout error:", err);
      showToast("Error logging out", "error");
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast(
        lang === "vi" ? "Mật khẩu mới không trùng khớp!" : "New passwords do not match!",
        "error"
      );
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          lang === "vi"
            ? "Đổi mật khẩu thành công! Vui lòng đăng nhập lại."
            : "Password changed successfully! Please log in again.",
          "success"
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => {
          handleLogout();
        }, 1500);
      } else {
        showToast(
          data.error || (lang === "vi" ? "Đổi mật khẩu thất bại!" : "Failed to change password!"),
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      showToast(lang === "vi" ? "Lỗi kết nối!" : "Network error!", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Toggle Campaign Status handler
  const handleToggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === "CAMPAIGN_STATUS_ENABLE" ? "CAMPAIGN_STATUS_DISABLE" : "CAMPAIGN_STATUS_ENABLE";
    
    setUpdatingCampaigns(prev => ({ ...prev, [campaignId]: true }));
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          lang === "vi" 
            ? "Cập nhật trạng thái chiến dịch thành công!" 
            : "Campaign status updated successfully!", 
          "success"
        );
        setCampaigns(prev =>
          prev.map(c => c.campaignId === campaignId ? { ...c, status: newStatus } : c)
        );
      } else {
        showToast(data.error || (lang === "vi" ? "Lỗi khi cập nhật trạng thái!" : "Error updating status!"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(lang === "vi" ? "Lỗi mạng!" : "Network error!", "error");
    } finally {
      setUpdatingCampaigns(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  // Update Campaign Budget handler
  const handleUpdateCampaignBudget = async (campaignId: string) => {
    const rawVal = tempCampaignBudget.replace(/\D/g, "");
    if (!rawVal) return;
    
    const budgetVal = parseFloat(rawVal);
    if (isNaN(budgetVal) || budgetVal < 0) {
      showToast(lang === "vi" ? "Ngân sách không hợp lệ!" : "Invalid budget!", "error");
      return;
    }

    setUpdatingCampaigns(prev => ({ ...prev, [campaignId]: true }));
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, budget: budgetVal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          lang === "vi" 
            ? "Cập nhật ngân sách chiến dịch thành công!" 
            : "Campaign budget updated successfully!", 
          "success"
        );
        setCampaigns(prev =>
          prev.map(c => c.campaignId === campaignId ? { ...c, budget: budgetVal } : c)
        );
        setEditingCampaignBudgetId(null);
      } else {
        showToast(data.error || (lang === "vi" ? "Lỗi khi cập nhật ngân sách!" : "Error updating budget!"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(lang === "vi" ? "Lỗi mạng!" : "Network error!", "error");
    } finally {
      setUpdatingCampaigns(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  // Update Campaign Target ROI handler
  const handleUpdateCampaignRoas = async (campaignId: string) => {
    if (!tempCampaignRoas) return;
    
    const roasVal = parseFloat(tempCampaignRoas);
    if (isNaN(roasVal) || roasVal < 0) {
      showToast(lang === "vi" ? "ROI/ROAS mục tiêu không hợp lệ!" : "Invalid target ROI/ROAS!", "error");
      return;
    }

    setUpdatingCampaigns(prev => ({ ...prev, [campaignId]: true }));
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, roasBid: roasVal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          lang === "vi" 
            ? "Cập nhật ROI mục tiêu chiến dịch thành công!" 
            : "Campaign target ROI updated successfully!", 
          "success"
        );
        setCampaigns(prev =>
          prev.map(c => c.campaignId === campaignId ? { ...c, roasBid: roasVal } : c)
        );
        setEditingCampaignRoasId(null);
      } else {
        showToast(data.error || (lang === "vi" ? "Lỗi khi cập nhật ROI mục tiêu!" : "Error updating target ROI!"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(lang === "vi" ? "Lỗi mạng!" : "Network error!", "error");
    } finally {
      setUpdatingCampaigns(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  // Resolve Alert handler
  const handleResolveAlert = async (id: string) => {
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: id }),
      });
      const res = await response.json();
      if (res.success) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "RESOLVED" } : a)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick 1-click Auto-Relaunch identical V2 campaign
  const handleQuickAutoRelaunch = async (campaignId: string, campaignName: string) => {
    const confirmMsg = lang === "vi"
      ? `Bạn có chắc muốn tự động tắt chiến dịch "${campaignName}" và khởi tạo chiến dịch mới V2 giống hệt (ngân sách, đối tượng, video/live...) không?`
      : `Are you sure you want to pause "${campaignName}" and launch an identical V2 campaign?`;
    
    if (!window.confirm(confirmMsg)) return;

    setRelaunchingId(campaignId);
    try {
      const response = await fetch("/api/campaigns/relaunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, force: true }),
      });
      const res = await response.json();
      if (res.success) {
        showToast(
          lang === "vi" 
            ? `Lên lại camp thành công! ID chiến dịch mới: ${res.data.newCampaignId}` 
            : `Relaunch successful! New Campaign ID: ${res.data.newCampaignId}`, 
          "success"
        );
        fetchData(startDate, endDate, true);
      } else {
        showToast(
          lang === "vi" ? `Lỗi lên lại camp: ${res.error}` : `Relaunch failed: ${res.error}`, 
          "error"
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast(lang === "vi" ? "Lỗi kết nối máy chủ!" : "Server connection error!", "error");
    } finally {
      setRelaunchingId(null);
    }
  };

  // Campaign relaunch handler
  const handleRelaunchCampaign = async (campaignId: string, alertId?: string) => {
    const localCamp = campaigns.find(c => c.campaignId === campaignId);
    const campaignName = localCamp ? localCamp.name : "Campaign " + campaignId;
    
    setRelaunchConfigCamp({ campaignId, alertId, name: campaignName });
    setIsLoadingRelaunchInfo(true);
    setRelaunchBudget("");
    setRelaunchRoas("");
    try {
      const res = await fetch(`/api/campaigns/info?campaignId=${campaignId}`);
      const resData = await res.json();
      if (res.ok && resData.success && resData.data) {
        setRelaunchBudget(formatNumberString(resData.data.budget));
        setRelaunchRoas(resData.data.roasBid ? resData.data.roasBid.toFixed(2) : "0.00");
      } else {
        // Fallback to local campaign data
        if (localCamp) {
          setRelaunchBudget(formatNumberString(localCamp.budget));
        }
        setRelaunchRoas("3.50"); // default fallback ROAS
      }
    } catch (err) {
      console.error(err);
      // Fallback
      if (localCamp) {
        setRelaunchBudget(formatNumberString(localCamp.budget));
      }
      setRelaunchRoas("3.50");
    } finally {
      setIsLoadingRelaunchInfo(false);
    }
  };

  // Submit custom campaign relaunch
  const submitRelaunchCampaign = async () => {
    if (!relaunchConfigCamp) return;
    const { campaignId, alertId } = relaunchConfigCamp;
    
    const budgetVal = parseFloat(relaunchBudget.replace(/\D/g, ""));
    const roasVal = parseFloat(relaunchRoas);

    if (isNaN(budgetVal) || budgetVal < 0) {
      showToast(lang === "vi" ? "Ngân sách không hợp lệ!" : "Invalid budget!", "error");
      return;
    }

    if (isNaN(roasVal) || roasVal < 0) {
      showToast(lang === "vi" ? "ROI/ROAS mục tiêu không hợp lệ!" : "Invalid target ROI/ROAS!", "error");
      return;
    }

    setRelaunchConfigCamp(null); // Close modal
    setRelaunchingId(campaignId); // Show loader spinner on campaign row

    try {
      const response = await fetch("/api/campaigns/relaunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          alertId,
          budget: budgetVal,
          roasBid: roasVal,
        }),
      });
      const res = await response.json();
      if (res.success) {
        showToast(
          lang === "vi" 
            ? `Tái khởi tạo thành công! Chiến dịch mới ID: ${res.data.newCampaignId}` 
            : `Relaunch successful! New Campaign ID: ${res.data.newCampaignId}`, 
          "success"
        );
        // Refresh dashboard data
        fetchData();
      } else {
        showToast(lang === "vi" ? `Lỗi tái khởi tạo: ${res.error}` : `Relaunch failed: ${res.error}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast(lang === "vi" ? "Có lỗi xảy ra trong quá trình kết nối API." : "An error occurred connecting to the API.", "error");
    } finally {
      setRelaunchingId(null);
    }
  };

  return (
    <div className={`min-h-screen bg-[#08090C] text-gray-100 flex flex-col font-sans select-none antialiased ${theme === "light" ? "light-theme" : ""}`}>
      {/* Background Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="border-b border-[#1F232B] bg-[#0E1015]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Row 1 on Mobile: Logo/Title + Language/Theme */}
        <div className="flex items-center justify-between gap-3 w-full md:w-auto flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 relative group">
              {/* Glowing shadow effect */}
              <div className="absolute inset-0 bg-indigo-500/20 rounded-lg blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
              
              <svg className="w-7 h-7 relative z-10 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" viewBox="0 0 35 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-inf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="40%" stopColor="#06B6D4" />
                    <stop offset="70%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <path 
                  d="M9.5 9.5 C 5.91 9.5, 3 12.41, 3 16 C 3 19.59, 5.91 22.5, 9.5 22.5 C 13.09 22.5, 15.91 19.59, 17.5 17.5 C 19.09 19.59, 21.91 22.5, 25.5 22.5 C 29.09 22.5, 32 19.59, 32 16 C 32 12.41, 29.09 9.5, 25.5 9.5 C 21.91 9.5, 19.09 12.41, 17.5 14.5 C 15.91 12.41, 13.09 9.5, 9.5 9.5 Z" 
                  stroke="url(#logo-inf-grad)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-wide text-white">{t.title}</h1>
              <p className="text-[10px] sm:text-xs text-gray-500 font-mono hidden sm:block">{t.subtitle}</p>
            </div>
          </div>

          {/* Quick controls on the right (Language + Theme) on mobile, hidden on desktop */}
          <div className="flex items-center gap-2 md:hidden flex-shrink-0">
            {/* Language Selector */}
            <div className="flex bg-[#15181F] border border-[#2B303C] rounded p-0.5">
              <button
                onClick={() => setLang("vi")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                  lang === "vi" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                VI
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                  lang === "en" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme Switcher */}
            <button
              onClick={() => {
                const newTheme = theme === "dark" ? "light" : "dark";
                setTheme(newTheme);
                localStorage.setItem("theme", newTheme);
              }}
              className="flex items-center justify-center w-7 h-7 rounded bg-[#15181F] border border-[#2B303C] text-gray-400 hover:text-indigo-400 transition-all cursor-pointer flex-shrink-0"
              title={lang === "vi" ? "Chuyển đổi giao diện Sáng/Tối" : "Toggle Light/Dark Theme"}
            >
              {theme === "dark" ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-7 h-7 rounded bg-[#15181F] border border-rose-950/40 text-rose-450 hover:bg-rose-950/30 transition-all cursor-pointer flex-shrink-0"
              title={lang === "vi" ? "Đăng xuất" : "Logout"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop Controls Group: Combines select dropdown, buttons, divider, and switcher */}
        <div className="flex flex-col md:flex-row items-center gap-4.5 w-full md:w-auto md:ml-auto">
          {/* Action Controls: Dropdown and buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            {/* Ad Account Switcher */}
            {dbAdvertisers.length > 0 && (
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAdDropdownOpen(!isAdDropdownOpen)}
                  className="bg-[#15181F] text-gray-200 text-xs border border-[#2B303C] rounded-lg pl-3.5 pr-8 py-2 cursor-pointer outline-none hover:border-indigo-500/50 hover:bg-[#1C1F2A] focus:border-indigo-500 transition-all duration-200 w-full sm:w-[220px] text-left shadow-sm relative flex items-center justify-between"
                  title={lang === "vi" ? "Chọn tài khoản quảng cáo" : "Select Ad Account"}
                >
                  <span className="truncate">
                    {selectedAdvertiser 
                      ? selectedAdvertiser 
                      : (lang === "vi" ? "Tất cả tài khoản" : "All Ad Accounts")}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 absolute right-2.5 transition-transform duration-200 pointer-events-none ${
                      isAdDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isAdDropdownOpen && (
                  <>
                    {/* Invisible overlay for close-on-click-outside */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsAdDropdownOpen(false)} 
                    />
                    
                    {/* Dropdown Options list */}
                    <div className="absolute right-0 mt-1.5 w-full sm:w-[280px] max-h-[300px] overflow-y-auto bg-[#15181F] border border-[#2B303C] rounded-lg shadow-xl z-50 py-1.5 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAdvertiser("");
                          setIsAdDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-indigo-600 hover:text-white block ${
                          selectedAdvertiser === "" 
                            ? "bg-indigo-500/10 text-indigo-400 font-bold" 
                            : "text-gray-300"
                        }`}
                      >
                        {lang === "vi" ? "Tất cả tài khoản quảng cáo" : "All Ad Accounts"}
                      </button>
                      
                      {dbAdvertisers.map((adv) => (
                        <button
                          key={adv.id}
                          type="button"
                          onClick={() => {
                            setSelectedAdvertiser(adv.name);
                            setIsAdDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-indigo-600 hover:text-white flex flex-col gap-0.5 ${
                            selectedAdvertiser === adv.name 
                              ? "bg-indigo-500/10 text-indigo-400 font-bold" 
                              : "text-gray-300"
                          }`}
                        >
                          <span className="truncate">{adv.name}</span>
                          <span className="text-[9px] text-gray-500 font-mono font-normal group-hover:text-white">ID: {adv.advertiserId}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sync & Telegram buttons row */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Sync Button */}
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-250 border ${
                  syncing
                    ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/30 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
                }`}
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-indigo-450" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.syncing}
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
                    </svg>
                    <span className="truncate text-white">{t.syncAccounts}</span>
                  </>
                )}
              </button>

              {/* Historical Sync Button */}
              <button
                onClick={() => { setShowHistoricalSyncModal(true); setHistoricalSyncResult(null); }}
                title={lang === "vi" ? "Khôi phục dữ liệu lịch sử" : "Recover historical data"}
                className="flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-250 border bg-amber-600/20 hover:bg-amber-500/30 text-amber-300 border-amber-700/40 shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline truncate">{lang === "vi" ? "Khôi phục" : "Recover"}</span>
              </button>

              {/* Telegram Report Button */}
              <button
                onClick={handleSendTelegramReport}
                disabled={sendingReport}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-250 border ${
                  sendingReport
                    ? "bg-[#0b283d]/40 text-sky-400 border-sky-900/30 cursor-not-allowed"
                    : "bg-sky-600 hover:bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-600/10 hover:shadow-sky-600/20 active:scale-[0.98] cursor-pointer"
                }`}
              >
                {sendingReport ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-sky-450" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{lang === "vi" ? "Đang gửi..." : "Sending..."}</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.7-2.48 2.75-2.7.01-.03.01-.15-.07-.22-.08-.07-.2-.05-.29-.03-.12.03-2.04 1.29-5.74 3.79-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.08-.49-.83-.27-1.49-.41-1.43-.87.03-.24.36-.49.98-.74 3.84-1.67 6.4-2.77 7.68-3.3 3.65-1.52 4.41-1.78 4.9-.18l.05.09c.07.13.14.3.16.48.02.13.01.27-.01.4z"/>
                    </svg>
                    <span className="truncate text-white">{lang === "vi" ? "Báo cáo" : "Report"}</span>
                  </>
                )}
              </button>

              {/* Export October Report Button (Direct TikTok API) */}
              <button
                onClick={() => {
                  showToast(lang === "vi" ? "Đang tải file Excel/CSV báo cáo tháng 10 trực tiếp từ TikTok API..." : "Exporting October report directly from TikTok API...", "info");
                  window.open("/api/export/malaysia", "_blank");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 transition-all text-xs font-semibold cursor-pointer"
                title={lang === "vi" ? "Tải file Excel / CSV bóc tách 4 nguồn từ 01/10 đến nay trực tiếp từ TikTok API" : "Download October report directly from TikTok API"}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{lang === "vi" ? "Xuất Sheet T10" : "Export Sheet"}</span>
              </button>
            </div>
          </div>

          {/* Desktop Only: Divider and Switchers */}
          <div className="hidden md:flex items-center gap-3">
            <div className="h-5 w-px bg-[#1F232B]" />
            {/* Language Selector */}
            <div className="flex bg-[#15181F] border border-[#2B303C] rounded p-0.5">
              <button
                onClick={() => setLang("vi")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                  lang === "vi" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                VI
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                  lang === "en" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme Switcher */}
            <button
              onClick={() => {
                const newTheme = theme === "dark" ? "light" : "dark";
                setTheme(newTheme);
                localStorage.setItem("theme", newTheme);
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#15181F] border border-[#2B303C] text-gray-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all cursor-pointer flex-shrink-0"
              title={lang === "vi" ? "Chuyển đổi giao diện Sáng/Tối" : "Toggle Light/Dark Theme"}
              id="theme-toggle-btn"
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#15181F] border border-rose-950/40 text-rose-450 hover:bg-rose-950/30 hover:border-rose-500/40 transition-all cursor-pointer flex-shrink-0"
              title={lang === "vi" ? "Đăng xuất" : "Logout"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-6">

        {/* Shop Switcher Buttons */}
        <section className="flex flex-col gap-3.5 bg-[#111318]/50 border border-[#1F232B]/85 rounded-xl p-5 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="w-24 h-24 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              {lang === "vi" ? "HỆ THỐNG CỬA HÀNG (GMV MAX)" : "STORE NETWORK (GMV MAX)"}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {shops.length} {lang === "vi" ? "cửa hàng trực tuyến" : "online shops"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5 mt-1 relative z-10">
            {/* All Shops Button */}
            <button
              onClick={() => setSelectedShop("")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                selectedShop === ""
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-400/50 shadow-md shadow-indigo-500/20"
                  : "bg-[#151820]/90 hover:bg-[#1E222D] text-gray-400 hover:text-gray-200 border-[#222733] hover:border-indigo-500/30"
              }`}
            >
              <span className="text-sm">🌐</span>
              <span>{t.allShops}</span>
            </button>

            {/* Shop Buttons */}
            {shops.map((shop) => (
              <button
                key={shop.id}
                onClick={() => setSelectedShop(shop.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                  selectedShop === shop.id
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-400/50 shadow-md shadow-indigo-500/20"
                    : "bg-[#151820]/90 hover:bg-[#1E222D] text-gray-400 hover:text-gray-200 border-[#222733] hover:border-indigo-500/30"
                }`}
              >
                <span className="text-sm">🛍️</span>
                <span>{shop.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Compact Collapsible Filter & Config Bar */}
        <section className="bg-[#111318]/45 border border-[#1F232B] rounded-xl backdrop-blur-md relative z-[100] overflow-visible">
          {/* Collapsed Summary Bar - always visible */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            {/* Left: Filter toggle + date summary + quick selectors */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                className="flex items-center gap-2 group cursor-pointer select-none"
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${
                  isFilterBarOpen
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                    : "bg-[#15181F] border-[#2B303C] text-gray-400 group-hover:border-indigo-500/30 group-hover:text-gray-200"
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-300">
                  {lang === "vi" ? "Bộ lọc" : "Filters"}
                </span>
                <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                  <span className="text-[9px] text-indigo-400 font-mono font-medium">
                    {startDate ? (lang === "vi" ? `${new Date(startDate + "T00:00:00").toLocaleDateString("vi-VN")}` : `${new Date(startDate + "T00:00:00").toLocaleDateString("en-US")}`) : "..."}
                    {" → "}
                    {endDate ? (lang === "vi" ? `${new Date(endDate + "T00:00:00").toLocaleDateString("vi-VN")}` : `${new Date(endDate + "T00:00:00").toLocaleDateString("en-US")}`) : "..."}
                  </span>
                </div>
                <span className={`text-[8px] transition-transform duration-200 ${isFilterBarOpen ? "rotate-180" : ""} text-gray-500`}>▼</span>
              </button>

              {/* Quick date selectors — left side, always visible */}
              <div className="h-5 w-px bg-[#1F232B] mx-1" />
              <button
                onClick={() => handleQuickDateSelect("today")}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                  startDate === getTodayString() && endDate === getTodayString()
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10"
                    : "bg-[#15181F] text-gray-400 hover:text-gray-200 border-[#2B303C] hover:border-indigo-500/30"
                }`}
              >
                {lang === "vi" ? "Hôm nay" : "Today"}
              </button>
              <button
                onClick={() => handleQuickDateSelect("yesterday")}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                  startDate === getYesterdayString() && endDate === getYesterdayString()
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10"
                    : "bg-[#15181F] text-gray-400 hover:text-gray-200 border-[#2B303C] hover:border-indigo-500/30"
                }`}
              >
                {lang === "vi" ? "Hôm qua" : "Yesterday"}
              </button>
            </div>

            {/* Right: Auto-relaunch only */}
            <div className="flex items-center gap-2">

              {/* Auto-relaunch toggle */}
              {selectedShop && (
                <>
                  <div className="h-5 w-px bg-[#1F232B]" />
                  <div className="relative">
                    <button
                      onClick={() => setIsRelaunchConfigOpen(!isRelaunchConfigOpen)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all select-none text-[10px] font-bold tracking-wider uppercase font-mono ${
                        isRelaunchConfigOpen
                          ? "bg-indigo-600/20 text-indigo-400 border-indigo-500 shadow-md shadow-indigo-500/10"
                          : "bg-[#15181F] text-gray-400 hover:text-gray-200 border-[#2B303C] hover:border-indigo-500/30"
                      }`}
                    >
                      <span className="text-xs">🤖</span>
                      <span className="hidden sm:inline">{lang === "vi" ? "Lên Camp Tự Động" : "Auto-Relaunch"}</span>
                      <span className="sm:hidden">{lang === "vi" ? "Auto" : "Auto"}</span>
                      <span className="text-[8px] opacity-75">{isRelaunchConfigOpen ? "▲" : "▼"}</span>
                    </button>

                    {/* Auto-relaunch Dropdown Popover */}
                    {isRelaunchConfigOpen && (
                      <div className="absolute right-0 top-full mt-2 z-[200] bg-[#111318] border border-[#1F232B] rounded-xl p-5 shadow-2xl flex flex-col gap-4 min-w-[340px] max-w-[380px] animate-slideDown backdrop-blur-md">
                        <div className="flex items-center justify-between border-b border-[#1F232B] pb-2">
                          <h4 className="text-[11px] font-bold tracking-wider uppercase font-mono text-indigo-400">
                            {lang === "vi" ? "CẤU HÌNH LÊN CAMP TỰ ĐỘNG" : "AUTO-RELAUNCH CONFIG"}
                          </h4>
                          <span className="text-[10px] text-gray-500 font-mono truncate max-w-[140px]">
                            {shops.find(s => s.id === selectedShop)?.name || ""}
                          </span>
                        </div>

                        {/* Video vs LIVE Sub-tabs */}
                        {/* Video vs LIVE vs In-house Sub-tabs */}
                        <div className="grid grid-cols-3 p-1 bg-[#15181F] rounded-lg border border-[#2B303C]/80 gap-1">
                          <button
                            type="button"
                            onClick={() => setRelaunchConfigTab("video")}
                            className={`py-1.5 px-1 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                              relaunchConfigTab === "video"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                : "text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            <span>🎬</span>
                            <span>{lang === "vi" ? "Video" : "Video"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRelaunchConfigTab("live")}
                            className={`py-1.5 px-1 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                              relaunchConfigTab === "live"
                                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                                : "text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            <span>🔴</span>
                            <span>{lang === "vi" ? "LIVE" : "LIVE"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRelaunchConfigTab("channels")}
                            className={`py-1.5 px-1 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                              relaunchConfigTab === "channels"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                : "text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            <span>🏢</span>
                            <span>{lang === "vi" ? "In-house" : "In-house"}</span>
                          </button>
                        </div>

                        {relaunchConfigTab === "channels" ? (
                          <div className="flex flex-col gap-2 p-3 bg-[#15181F] border border-[#2B303C] rounded-lg">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-gray-200 font-bold">
                                {lang === "vi" ? "Kênh TikTok In-house của Shop" : "In-house TikTok Channels"}
                              </span>
                              <span className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                                {lang === "vi"
                                  ? "Nhập các username kênh TikTok chính thức của shop (ngăn cách bằng dấu phẩy). Video từ các kênh này tự động tính là In-house, các video còn lại là Affiliate."
                                  : "Enter official TikTok usernames separated by comma. Videos from these handles are marked In-house, others Affiliate."}
                              </span>
                            </div>
                            <textarea
                              rows={3}
                              placeholder="@actiscar_malaysia, @actiscar_official"
                              value={tempInhouseChannels}
                              onChange={(e) => setTempInhouseChannels(e.target.value)}
                              className="bg-[#0E1015] text-indigo-300 text-xs border border-[#2B303C] rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono resize-none w-full"
                            />
                            <span className="text-[9px] text-gray-500 font-mono">
                              {tempInhouseChannels.trim()
                                ? `${tempInhouseChannels.split(/[,;\n]/).filter(s => s.trim()).length} ${lang === "vi" ? "kênh đã cấu hình" : "channels configured"}`
                                : (lang === "vi" ? "Chưa có kênh nào (Tất cả video coi như Affiliate)" : "No channels configured (All videos treated as Affiliate)")}
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Switch Enabled / Disabled */}
                            <div className="flex items-center justify-between gap-3 bg-[#15181F] border border-[#2B303C] rounded-lg px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-[11px] text-gray-200 font-bold">
                                  {relaunchConfigTab === "video"
                                    ? (lang === "vi" ? "Tự động lên camp Video" : "Auto-relaunch Video")
                                    : (lang === "vi" ? "Tự động lên camp LIVE" : "Auto-relaunch LIVE")}
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono">
                                  {relaunchConfigTab === "video" ? "ShoppingAds: PRODUCT" : "ShoppingAds: LIVE"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (relaunchConfigTab === "video") {
                                    setTempVideoEnabled(!tempVideoEnabled);
                                  } else {
                                    setTempLiveEnabled(!tempLiveEnabled);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                                  (relaunchConfigTab === "video" ? tempVideoEnabled : tempLiveEnabled)
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-gray-800 text-gray-400 border border-gray-700"
                                }`}
                              >
                                {(relaunchConfigTab === "video" ? tempVideoEnabled : tempLiveEnabled)
                                  ? (lang === "vi" ? "✓ ĐANG BẬT" : "✓ ENABLED")
                                  : (lang === "vi" ? "✕ ĐANG TẮT" : "✕ DISABLED")}
                              </button>
                            </div>

                            {/* Threshold inputs */}
                            {(relaunchConfigTab === "video" ? tempVideoEnabled : tempLiveEnabled) ? (
                              <div className="flex flex-col gap-3">
                                {/* ROI Input */}
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">{lang === "vi" ? "Ngưỡng ROI <" : "Min ROI <"}</span>
                                    <span className="text-[9px] text-gray-500">{lang === "vi" ? "Tự tắt & lên lại nếu ROI thấp hơn" : "Pause & relaunch if ROI below"}</span>
                                  </div>
                                  <div className="flex items-center bg-[#15181F] border border-[#2B303C] hover:border-indigo-500/50 focus-within:border-indigo-500 rounded-lg transition-all px-3 py-1.5">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      max="10"
                                      value={relaunchConfigTab === "video" ? tempVideoRoi : tempLiveRoi}
                                      onChange={(e) => {
                                        if (relaunchConfigTab === "video") setTempVideoRoi(e.target.value);
                                        else setTempLiveRoi(e.target.value);
                                      }}
                                      className="w-12 bg-transparent text-white text-xs font-mono font-bold outline-none text-right"
                                    />
                                  </div>
                                </div>

                                {/* Spend Input */}
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">{lang === "vi" ? "Chi tiêu ≥" : "Spend ≥"}</span>
                                    <span className="text-[9px] text-gray-500">{lang === "vi" ? "Đạt chi tiêu mới bắt đầu xét duyệt" : "Minimum spend required"}</span>
                                  </div>
                                  <div className="flex items-center bg-[#15181F] border border-[#2B303C] hover:border-indigo-500/50 focus-within:border-indigo-500 rounded-lg transition-all pl-3 pr-2 py-1.5">
                                    <input
                                      type="text"
                                      value={formatNumberString(relaunchConfigTab === "video" ? tempVideoMinSpend : tempLiveMinSpend)}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        if (relaunchConfigTab === "video") setTempVideoMinSpend(val);
                                        else setTempLiveMinSpend(val);
                                      }}
                                      className="w-20 bg-transparent text-white text-xs font-mono font-bold outline-none text-right"
                                    />
                                    <span className="text-[10px] text-gray-500 font-mono ml-1">đ</span>
                                  </div>
                                </div>

                                {/* Orders Input */}
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">{lang === "vi" ? "Lượng đơn <" : "Orders <"}</span>
                                    <span className="text-[9px] text-gray-500">{lang === "vi" ? "Đạt từ số đơn này sẽ không bị tắt" : "Safety: keep if orders reach this"}</span>
                                  </div>
                                  <div className="flex items-center bg-[#15181F] border border-[#2B303C] hover:border-indigo-500/50 focus-within:border-indigo-500 rounded-lg transition-all px-3 py-1.5">
                                    <input
                                      type="number"
                                      step="1"
                                      min="0"
                                      value={relaunchConfigTab === "video" ? tempVideoMaxOrders : tempLiveMaxOrders}
                                      onChange={(e) => {
                                        if (relaunchConfigTab === "video") setTempVideoMaxOrders(e.target.value);
                                        else setTempLiveMaxOrders(e.target.value);
                                      }}
                                      className="w-12 bg-transparent text-white text-xs font-mono font-bold outline-none text-right"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-300 leading-relaxed">
                                {lang === "vi"
                                  ? `Đang TẮT tự động lên camp cho ${relaunchConfigTab === "video" ? "Video" : "LIVE"}. Bot sẽ không tự tắt hoặc tái khởi tạo các chiến dịch loại này.`
                                  : `Auto-relaunch is DISABLED for ${relaunchConfigTab === "video" ? "Video" : "LIVE"}. Bot will not pause or clone campaigns of this type.`}
                              </div>
                            )}
                          </>
                        )}

                        {/* Save Button */}
                        <button
                          onClick={() => {
                            handleSaveRoiThreshold();
                            setIsRelaunchConfigOpen(false);
                          }}
                          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all duration-200 shadow-md shadow-indigo-600/10 active:scale-[0.98] border border-indigo-500 cursor-pointer"
                        >
                          {lang === "vi" ? "Lưu cấu hình" : "Save settings"}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Expanded Date Picker Panel */}
          {isFilterBarOpen && (
            <div className="border-t border-[#1F232B] px-4 py-3 animate-slideDown">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                  {lang === "vi" ? "Khoảng thời gian:" : "Date range:"}
                </span>
                {/* Start Date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 uppercase font-mono">
                    {lang === "vi" ? "Từ" : "From"}
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="bg-[#15181F] text-gray-200 text-xs font-mono outline-none border border-[#2B303C] rounded-lg px-2.5 py-1.5 cursor-pointer [color-scheme:dark] hover:border-indigo-500/50 focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* End Date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 uppercase font-mono">
                    {lang === "vi" ? "Đến" : "To"}
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="bg-[#15181F] text-gray-200 text-xs font-mono outline-none border border-[#2B303C] rounded-lg px-2.5 py-1.5 cursor-pointer [color-scheme:dark] hover:border-indigo-500/50 focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Separator */}
                <div className="h-4 w-px bg-[#1F232B] hidden md:block mx-1" />
                <span className="text-[10px] text-gray-500 uppercase font-mono md:hidden block mt-1 w-full">
                  {lang === "vi" ? "— Hoặc —" : "— Or —"}
                </span>

                {/* Quick Single Date View */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-indigo-400 font-mono uppercase font-bold tracking-wider">
                    {lang === "vi" ? "Xem nhanh 1 ngày:" : "Quick 1 Day:"}
                  </span>
                  <input
                    type="date"
                    value={startDate === endDate ? startDate : ""}
                    onChange={(e) => {
                      if (e.target.value) handleSingleDateSelect(e.target.value);
                    }}
                    className="bg-[#15181F] text-gray-200 text-xs font-mono outline-none border border-indigo-500/30 rounded-lg px-2.5 py-1.5 cursor-pointer [color-scheme:dark] hover:border-indigo-500/50 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Top KPI Widgets */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Widget 1 */}
          <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-gray-400 text-xs font-mono font-medium tracking-wide">{t.totalGmv}</span>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-2xl font-bold text-white tracking-tight">{formatVND(activeWidgets.totalGMV)}</span>
              <button
                onClick={() => handleCopyText(new Intl.NumberFormat('vi-VN').format(Math.round(activeWidgets.totalGMV)), lang === "vi" ? "Tổng GMV" : "Total GMV")}
                className="text-gray-500 hover:text-cyan-400 p-1 rounded hover:bg-gray-800 transition-colors flex items-center justify-center"
                title={lang === "vi" ? "Sao chép Tổng GMV" : "Copy Total GMV"}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
              <span className="text-emerald-400 text-xs font-mono font-bold ml-1">▲ Live</span>
            </div>
            <div className="mt-2 h-1 w-full bg-[#1F232B] rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 w-3/4 rounded-full" />
            </div>
          </div>

          {/* Widget 2 */}
          <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-gray-400 text-xs font-mono font-medium tracking-wide">{t.totalSpend}</span>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-2xl font-bold text-white tracking-tight">{formatVND(activeWidgets.totalSpend)}</span>
              <button
                onClick={() => handleCopyText(new Intl.NumberFormat('vi-VN').format(Math.round(activeWidgets.totalSpend)), lang === "vi" ? "Tổng chi phí" : "Total Spend")}
                className="text-gray-500 hover:text-indigo-400 p-1 rounded hover:bg-gray-800 transition-colors flex items-center justify-center"
                title={lang === "vi" ? "Sao chép Tổng chi phí" : "Copy Total Spend"}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
              <span className="text-gray-500 text-xs font-mono ml-1">VND</span>
            </div>
            <div className="mt-2 h-1 w-full bg-[#1F232B] rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-1/2 rounded-full" />
            </div>
          </div>

          {/* Widget 3 */}
          <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-gray-400 text-xs font-mono font-medium tracking-wide">{t.averageRoi}</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400 tracking-tight">{activeWidgets.averageROI.toFixed(2)}x</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${activeWidgets.averageROI >= 3.5 ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                {activeWidgets.averageROI >= 3.5 ? (lang === "vi" ? "MẠNH" : "HEALTHY") : (lang === "vi" ? "THẤP" : "CRITICAL")}
              </span>
            </div>
            <div className="mt-2 h-1 w-full bg-[#1F232B] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${activeWidgets.averageROI >= 3.5 ? "bg-emerald-500 w-4/5" : "bg-rose-500 w-1/3"}`} />
            </div>
          </div>

          {/* Widget 4 */}
          <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-gray-400 text-xs font-mono font-medium tracking-wide">{t.totalOrders}</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">{activeWidgets.totalOrders}</span>
              <span className="text-gray-500 text-xs font-mono">{lang === "vi" ? "Đơn hàng" : "Purchases"}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-[#1F232B] rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-3/5 rounded-full" />
            </div>
          </div>

          {/* Widget 5 */}
          <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="h-10 w-10 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="text-gray-400 text-xs font-mono font-medium tracking-wide">{t.averageCtr}</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">{(activeWidgets.averageCTR * 100).toFixed(2)}%</span>
              <span className="text-gray-500 text-xs font-mono">Clicks/Imp</span>
            </div>
            <div className="mt-2 h-1 w-full bg-[#1F232B] rounded-full overflow-hidden">
              <div className="h-full bg-pink-500 w-2/5 rounded-full" />
            </div>
          </div>
        </section>

        {/* 4 Revenue Sources Breakdown (Live, Video In-house, Video Affiliate, Thẻ sản phẩm) */}
        <section className="bg-[#111318] border border-[#1F232B] rounded-xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F232B] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-1 bg-gradient-to-b from-indigo-500 via-rose-500 to-emerald-500 rounded-full" />
              <div>
                <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono flex items-center gap-2">
                  <span>{lang === "vi" ? "PHÂN BỔ DOANH THU THEO NGUỒN" : "REVENUE BREAKDOWN BY SOURCE"}</span>
                  <span className="text-[9px] font-normal normal-case px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {lang === "vi" ? "Tự động phân loại" : "Auto-categorized"}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {lang === "vi" 
                    ? "Hiệu quả chi tiết giữa Livestream, Video In-house (kênh nhà), Video Affiliate (KOC) và Thẻ sản phẩm" 
                    : "Performance split between Live, In-house Video, Affiliate Video and Product Cards"}
                </p>
              </div>
            </div>
            {selectedShop && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[10px] font-mono text-gray-400 bg-[#15181F] border border-[#2B303C] px-2.5 py-1 rounded-md">
                  {lang === "vi" ? "Kênh In-house: " : "In-house: "}
                  <strong className="text-emerald-400">
                    {tempInhouseChannels.trim() ? tempInhouseChannels : (lang === "vi" ? "Chưa cài đặt" : "None")}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRelaunchConfigTab("channels");
                    setIsRelaunchConfigOpen(true);
                  }}
                  className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 underline"
                  title={lang === "vi" ? "Cài đặt danh sách kênh TikTok In-house" : "Configure in-house channels"}
                >
                  {lang === "vi" ? "Cài đặt" : "Edit"}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Live Shopping */}
            <div className="bg-[#15181F] border border-rose-500/20 hover:border-rose-500/40 rounded-lg p-3.5 flex flex-col justify-between transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 font-mono uppercase">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  {lang === "vi" ? "Doanh thu LIVE" : "LIVE Shopping"}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-900/60 font-bold">
                  ROI: {((activeWidgets as any).sources?.live?.roi || 0).toFixed(2)}x
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-bold text-white tracking-tight">
                  {formatVND((activeWidgets as any).sources?.live?.gmv || 0)}
                </span>
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mt-1 pt-1.5 border-t border-[#1F232B]">
                  <span>{lang === "vi" ? "Chi phí:" : "Spend:"} <strong className="text-gray-200">{formatVND((activeWidgets as any).sources?.live?.spend || 0)}</strong></span>
                  <span>{lang === "vi" ? "Đơn:" : "Orders:"} <strong className="text-rose-400">{(activeWidgets as any).sources?.live?.orders || 0}</strong></span>
                </div>
              </div>
            </div>

            {/* 2. Video In-house */}
            <div className="bg-[#15181F] border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg p-3.5 flex flex-col justify-between transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 font-mono uppercase">
                  <span>🎬</span>
                  {lang === "vi" ? "Video In-house" : "In-house Video"}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-900/60 font-bold">
                  ROI: {((activeWidgets as any).sources?.inhouse?.roi || 0).toFixed(2)}x
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-bold text-white tracking-tight">
                  {formatVND((activeWidgets as any).sources?.inhouse?.gmv || 0)}
                </span>
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mt-1 pt-1.5 border-t border-[#1F232B]">
                  <span>{lang === "vi" ? "Chi phí:" : "Spend:"} <strong className="text-gray-200">{formatVND((activeWidgets as any).sources?.inhouse?.spend || 0)}</strong></span>
                  <span>{lang === "vi" ? "Đơn:" : "Orders:"} <strong className="text-emerald-400">{(activeWidgets as any).sources?.inhouse?.orders || 0}</strong></span>
                </div>
              </div>
            </div>

            {/* 3. Video Affiliate (KOC) */}
            <div className="bg-[#15181F] border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg p-3.5 flex flex-col justify-between transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5 font-mono uppercase">
                  <span>✨</span>
                  {lang === "vi" ? "Video Affiliate (KOC)" : "Affiliate Video"}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-900/60 font-bold">
                  ROI: {((activeWidgets as any).sources?.affiliate?.roi || 0).toFixed(2)}x
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-bold text-white tracking-tight">
                  {formatVND((activeWidgets as any).sources?.affiliate?.gmv || 0)}
                </span>
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mt-1 pt-1.5 border-t border-[#1F232B]">
                  <span>{lang === "vi" ? "Chi phí:" : "Spend:"} <strong className="text-gray-200">{formatVND((activeWidgets as any).sources?.affiliate?.spend || 0)}</strong></span>
                  <span>{lang === "vi" ? "Đơn:" : "Orders:"} <strong className="text-indigo-400">{(activeWidgets as any).sources?.affiliate?.orders || 0}</strong></span>
                </div>
              </div>
            </div>

            {/* 4. Thẻ sản phẩm (Product Cards) */}
            <div className="bg-[#15181F] border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg p-3.5 flex flex-col justify-between transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 font-mono uppercase">
                  <span>🛍️</span>
                  {lang === "vi" ? "Thẻ sản phẩm (Shop Tab)" : "Product Cards"}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-900/60 font-bold">
                  ROI: {((activeWidgets as any).sources?.productCard?.roi || 0).toFixed(2)}x
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-bold text-white tracking-tight">
                  {formatVND((activeWidgets as any).sources?.productCard?.gmv || 0)}
                </span>
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mt-1 pt-1.5 border-t border-[#1F232B]">
                  <span>{lang === "vi" ? "Chi phí:" : "Spend:"} <strong className="text-gray-200">{formatVND((activeWidgets as any).sources?.productCard?.spend || 0)}</strong></span>
                  <span>{lang === "vi" ? "Đơn:" : "Orders:"} <strong className="text-cyan-400">{(activeWidgets as any).sources?.productCard?.orders || 0}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#1F232B] pb-px">
          <div className="flex gap-1 overflow-x-auto max-w-full no-scrollbar whitespace-nowrap">
            {[
              { id: "campaigns", label: t.tabCampaigns },
              // { id: "products", label: t.tabProducts },
              { id: "creatives", label: t.tabCreatives },
              { id: "alerts", label: `${t.tabAlerts} (${alerts.filter(a => a.status === "UNRESOLVED").length})` },
              { id: "ai", label: t.tabAi },
              { id: "settings", label: t.tabSettings },
              { id: "docs", label: t.tabDocs },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3.5 text-xs font-semibold border-b-2 transition-all outline-none flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gray-500 font-mono flex-shrink-0 self-end md:self-auto pb-1 md:pb-0">
            {lang === "vi" 
              ? `Đồng bộ tự động: 5 phút / lần${lastUpdatedTime ? ` • Cập nhật: ${lastUpdatedTime}` : ""}` 
              : `${t.lastUpdate}${lastUpdatedTime ? ` • ${lastUpdatedTime}` : ""}`}
          </div>
        </section>

        {/* Loading Overlay */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-gray-400 font-mono">{lang === "vi" ? "Đang tải dữ liệu..." : "Loading data nodes..."}</p>
          </div>
        ) : (
          <div className="flex-1 min-h-[500px]">
            {/* Tab 1: Campaigns */}
            {activeTab === "campaigns" && (
              <div className="bg-[#111318] border border-[#1F232B] rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1F232B] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-sm font-semibold text-white">
                        {lang === "vi" ? "Báo cáo Hiệu suất Chiến dịch GMV Max" : "GMV Max Campaigns Performance"}
                      </h3>
                      <div className="flex bg-[#15181F] border border-[#2B303C] rounded p-0.5">
                        <button
                          onClick={() => setGmvMaxTypeFilter("ALL")}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                            gmvMaxTypeFilter === "ALL" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {lang === "vi" ? "Tất cả" : "All"}
                        </button>
                        <button
                          onClick={() => setGmvMaxTypeFilter("PRODUCT")}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                            gmvMaxTypeFilter === "PRODUCT" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {lang === "vi" ? "Sản phẩm" : "Product"}
                        </button>
                        <button
                          onClick={() => setGmvMaxTypeFilter("LIVE")}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                            gmvMaxTypeFilter === "LIVE" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          Live
                        </button>
                      </div>

                      {/* Campaign Status Filter */}
                      <div className="flex bg-[#15181F] border border-[#2B303C] rounded p-0.5 ml-1">
                        <button
                          type="button"
                          onClick={() => setStatusFilter("ALL")}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                            statusFilter === "ALL" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {lang === "vi" ? "Tất cả trạng thái" : "All Status"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter("ACTIVE")}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                            statusFilter === "ACTIVE" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {lang === "vi" ? "Hoạt động" : "Active"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter("PAUSED")}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                            statusFilter === "PAUSED" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {lang === "vi" ? "Tạm dừng" : "Paused"}
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-[#1E293B] text-gray-400 px-2 py-0.5 rounded">
                      {filteredCampaigns.length} {lang === "vi" ? "Chiến dịch hoạt động" : "Campaigns Loaded"}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#151820] text-gray-400 border-b border-[#1F232B] font-mono text-[10px] uppercase select-none">
                        <th className="w-10 px-4 py-3"></th>
                        <th onClick={() => toggleSort("name")} className="px-6 py-3 font-semibold cursor-pointer hover:text-white transition-colors">
                          {t.campaignName} {sortBy === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("status")} className="px-6 py-3 font-semibold cursor-pointer hover:text-white transition-colors">
                          {t.status} {sortBy === "status" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("spend")} className="px-6 py-3 font-semibold text-right cursor-pointer hover:text-white transition-colors">
                          {t.spend} {sortBy === "spend" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("gmv")} className="px-6 py-3 font-semibold text-right cursor-pointer hover:text-white transition-colors">
                          {t.gmv} {sortBy === "gmv" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("roi")} className="px-6 py-3 font-semibold text-right cursor-pointer hover:text-white transition-colors">
                          {t.roi} {sortBy === "roi" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("orders")} className="px-6 py-3 font-semibold text-right cursor-pointer hover:text-white transition-colors">
                          {t.orders} {sortBy === "orders" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("impressions")} className="px-6 py-3 font-semibold text-right cursor-pointer hover:text-white transition-colors">
                          {t.impressions} {sortBy === "impressions" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("clicks")} className="px-6 py-3 font-semibold text-right cursor-pointer hover:text-white transition-colors">
                          {t.clicks} {sortBy === "clicks" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("ctr")} className="px-6 py-3 font-semibold text-right cursor-pointer hover:text-white transition-colors">
                          {t.ctr} {sortBy === "ctr" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                        <th onClick={() => toggleSort("convRate")} className="px-6 py-3 font-semibold text-right cursor-pointer hover:text-white transition-colors">
                          {t.convRate} {sortBy === "convRate" && (sortOrder === "asc" ? "▲" : "▼")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F232B]">
                      {filteredCampaigns.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-6 py-12 text-center text-gray-500 font-mono">
                            {t.noCampaigns}
                          </td>
                        </tr>
                      ) : (
                        paginatedCampaigns.map((camp) => (
                          <React.Fragment key={camp.id}>
                            <tr
                              className={`hover:bg-[#151820]/45 transition-colors cursor-pointer ${
                                expandedCampaigns[camp.id] ? "bg-[#151820]/25" : ""
                              }`}
                              onClick={() => {
                                setExpandedCampaigns((prev) => ({
                                  ...prev,
                                  [camp.id]: !prev[camp.id],
                                }));
                              }}
                            >
                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedCampaigns((prev) => ({
                                      ...prev,
                                      [camp.id]: !prev[camp.id],
                                    }));
                                  }}
                                  className="text-gray-500 hover:text-white transition-colors focus:outline-none"
                                  title={lang === "vi" ? "Xem biểu đồ tiêu tiền" : "View spend chart"}
                                >
                                  <svg
                                    className={`w-3.5 h-3.5 transform transition-transform duration-250 ${
                                      expandedCampaigns[camp.id] ? "rotate-90 text-cyan-400" : ""
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="min-w-0">
                                  <span className="font-semibold text-white block truncate max-w-[260px]" title={camp.name}>
                                    {camp.name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-gray-500 font-mono">{camp.campaignId}</span>
                                    {camp.createdAt && (
                                      <>
                                        <span className="text-[10px] text-gray-650 font-mono">•</span>
                                        <span className="text-[10px] text-indigo-400/85 font-mono">
                                          {lang === "vi" ? "Tạo: " : "Created: "}
                                          {new Date(camp.createdAt).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US")}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Inline Budget Display & Editor */}
                                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-450 font-mono select-none" onClick={(e) => e.stopPropagation()}>
                                    <span>💰 {lang === "vi" ? "Ngân sách:" : "Budget:"}</span>
                                    {editingCampaignBudgetId === camp.campaignId ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={tempCampaignBudget}
                                          onChange={(e) => setTempCampaignBudget(formatNumberString(e.target.value))}
                                          className="bg-[#15181F] text-white text-[10px] font-mono border border-indigo-500 rounded px-1.5 py-0.5 outline-none w-20"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleUpdateCampaignBudget(camp.campaignId);
                                            if (e.key === "Escape") setEditingCampaignBudgetId(null);
                                          }}
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleUpdateCampaignBudget(camp.campaignId)}
                                          className="text-emerald-400 hover:text-emerald-300 font-bold"
                                          title={lang === "vi" ? "Lưu" : "Save"}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => setEditingCampaignBudgetId(null)}
                                          className="text-rose-400 hover:text-rose-300 font-bold"
                                          title={lang === "vi" ? "Hủy" : "Cancel"}
                                        >
                                          ✗
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 group">
                                        <span className="text-gray-300 font-bold">
                                          {camp.budgetMode === "BUDGET_MODE_INFINITE" ? (lang === "vi" ? "Không giới hạn" : "Unlimited") : formatVND(camp.budget)}
                                        </span>
                                        <button
                                          onClick={() => {
                                            setEditingCampaignBudgetId(camp.campaignId);
                                            setTempCampaignBudget(formatNumberString(camp.budget));
                                          }}
                                          className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-300 transition-opacity ml-1"
                                          title={lang === "vi" ? "Sửa ngân sách" : "Edit budget"}
                                        >
                                          ✏️
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Inline Target ROI Display & Editor */}
                                  {camp.objectiveType === "OUTFLOW_GMV_MAX" && (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-450 font-mono select-none" onClick={(e) => e.stopPropagation()}>
                                      <span>🎯 {lang === "vi" ? "ROI mục tiêu:" : "Target ROI:"}</span>
                                      {editingCampaignRoasId === camp.campaignId ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            step="0.05"
                                            min="0.1"
                                            value={tempCampaignRoas}
                                            onChange={(e) => setTempCampaignRoas(e.target.value)}
                                            className="bg-[#15181F] text-white text-[10px] font-mono border border-indigo-500 rounded px-1.5 py-0.5 outline-none w-14"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") handleUpdateCampaignRoas(camp.campaignId);
                                              if (e.key === "Escape") setEditingCampaignRoasId(null);
                                            }}
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleUpdateCampaignRoas(camp.campaignId)}
                                            className="text-emerald-400 hover:text-emerald-300 font-bold"
                                            title={lang === "vi" ? "Lưu" : "Save"}
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={() => setEditingCampaignRoasId(null)}
                                            className="text-rose-400 hover:text-rose-300 font-bold"
                                            title={lang === "vi" ? "Hủy" : "Cancel"}
                                          >
                                            ✗
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 group">
                                          <span className="text-gray-300 font-bold">
                                            {camp.roasBid ? `${camp.roasBid.toFixed(2)}x` : "0.00x"}
                                          </span>
                                          <button
                                            onClick={() => {
                                              setEditingCampaignRoasId(camp.campaignId);
                                              setTempCampaignRoas(camp.roasBid ? String(camp.roasBid) : "3.50");
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-300 transition-opacity ml-1"
                                            title={lang === "vi" ? "Sửa ROI mục tiêu" : "Edit target ROI"}
                                          >
                                            ✏️
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Quick Auto-Relaunch Button directly under the campaign */}
                                  <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAutoRelaunch(camp.campaignId, camp.name)}
                                      disabled={relaunchingId === camp.campaignId}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-[10px] font-bold tracking-wide transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
                                      title={lang === "vi" ? "Tự động tắt chiến dịch này và khởi tạo chiến dịch V2 mới giống hệt" : "Pause this campaign and auto-relaunch an identical V2"}
                                    >
                                      {relaunchingId === camp.campaignId ? (
                                        <>
                                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                          </svg>
                                          <span>{lang === "vi" ? "Đang lên camp..." : "Relaunching..."}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span>⚡</span>
                                          <span>{lang === "vi" ? "Lên lại camp mới (V2)" : "Relaunch V2"}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2 select-none">
                                  <button
                                    onClick={() => handleToggleCampaignStatus(camp.campaignId, camp.status)}
                                    disabled={updatingCampaigns[camp.campaignId]}
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-250 ease-in-out focus:outline-none disabled:opacity-40 ${
                                      camp.status === "CAMPAIGN_STATUS_ENABLE" ? "bg-emerald-500" : "bg-[#252833] border-[#3E4357]/20"
                                    }`}
                                    title={camp.status === "CAMPAIGN_STATUS_ENABLE" ? (lang === "vi" ? "Tạm dừng chiến dịch" : "Pause campaign") : (lang === "vi" ? "Bật chiến dịch" : "Enable campaign")}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-250 ease-in-out ${
                                        camp.status === "CAMPAIGN_STATUS_ENABLE" ? "translate-x-3" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                  {updatingCampaigns[camp.campaignId] ? (
                                    <svg className="animate-spin h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  ) : (
                                    <span className={`text-[9px] font-mono font-bold ${
                                      camp.status === "CAMPAIGN_STATUS_ENABLE" ? "text-emerald-400" : "text-gray-500"
                                    }`}>
                                      {camp.status === "CAMPAIGN_STATUS_ENABLE" ? t.active : t.paused}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono">{formatVND(camp.spend)}</td>
                              <td className="px-6 py-4 text-right font-mono text-white">{formatVND(camp.gmv)}</td>
                              <td className="px-6 py-4 text-right font-mono font-semibold">
                                <div className="flex flex-col items-end gap-1">
                                  <span className={camp.roi >= 3.5 ? "text-emerald-400" : "text-rose-400"}>
                                    {camp.roi.toFixed(2)}x
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono">{camp.orders}</td>
                              <td className="px-6 py-4 text-right font-mono text-gray-400">{camp.impressions.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-mono text-gray-400">{camp.clicks.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-mono text-gray-400">{(camp.ctr * 100).toFixed(2)}%</td>
                              <td className="px-6 py-4 text-right font-mono text-gray-400">{(camp.convRate * 100).toFixed(2)}%</td>
                            </tr>
                            {expandedCampaigns[camp.id] && (
                              <tr className="bg-[#0A0B0E] border-b border-[#1F232B] select-text">
                                <td colSpan={11} className="px-6 py-5">
                                  <div className="flex flex-col lg:flex-row gap-6 w-full">
                                    {/* Left Column - Spend Chart */}
                                    <div className="flex-1 min-w-0 w-full">
                                      <CampaignSpendChart
                                        reports={camp.reports || []}
                                        budget={camp.budget}
                                        budgetMode={camp.budgetMode}
                                        lang={lang}
                                      />
                                    </div>

                                    {/* Right Column - Analysis & Speed Evaluation */}
                                    <div className="w-full lg:w-96 flex flex-col gap-4 bg-[#111318]/45 p-4 rounded-lg border border-[#1F232B]/80 shrink-0">
                                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                                        {lang === "vi" ? "Đánh giá tốc độ tiêu tiền" : "Spend Speed Evaluation"}
                                      </h4>

                                      {(() => {
                                        const analysis = evaluateSpendSpeed(
                                          camp.reports || [],
                                          camp.budget,
                                          camp.budgetMode,
                                          lang,
                                          isUsdMode
                                        );

                                        return (
                                          <div className="flex flex-col gap-3">
                                            {/* Badge Row */}
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] text-gray-500 font-mono">
                                                {lang === "vi" ? "Trạng thái:" : "Status:"}
                                              </span>
                                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${analysis.badgeClass}`}>
                                                {analysis.badgeText}
                                              </span>
                                            </div>

                                            {/* Trend Row */}
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] text-gray-500 font-mono">
                                                {lang === "vi" ? "Xu hướng tiêu tiền:" : "Spend Trend:"}
                                              </span>
                                              <span className={`text-[10px] font-bold font-mono ${analysis.trendClass}`}>
                                                {analysis.trendText}
                                              </span>
                                            </div>

                                            {/* Budget details */}
                                            <div className="flex items-center justify-between border-t border-[#1F232B]/60 pt-2">
                                              <span className="text-[10px] text-gray-500 font-mono">
                                                {lang === "vi" ? "Cấu hình ngân sách:" : "Budget Configuration:"}
                                              </span>
                                              <span className="text-[10px] text-gray-300 font-mono">
                                                {camp.budgetMode === "BUDGET_MODE_DAY"
                                                  ? `${lang === "vi" ? "Hàng ngày" : "Daily"}: ${formatVND(camp.budget)}`
                                                  : (camp.budgetMode === "BUDGET_MODE_TOTAL" 
                                                      ? `${lang === "vi" ? "Tổng ngân sách" : "Lifetime"}: ${formatVND(camp.budget)}` 
                                                      : (lang === "vi" ? "Không giới hạn" : "Unlimited"))
                                                }
                                              </span>
                                            </div>

                                            {/* Summary sentence */}
                                            <p className="text-xs text-gray-400 leading-relaxed font-sans mt-1">
                                              {analysis.explanation}
                                            </p>

                                            {/* Action suggestion */}
                                            <div className="mt-2 bg-[#1C1F2E]/30 border border-indigo-950/50 p-2.5 rounded text-[11px] leading-relaxed text-indigo-300">
                                              <strong className="text-indigo-400 font-semibold uppercase tracking-wider block text-[9px] font-mono mb-0.5">
                                                {lang === "vi" ? "Khuyến nghị đề xuất:" : "Suggested Action:"}
                                              </strong>
                                              {analysis.suggestion}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredCampaigns.length > CAMPAIGNS_PER_PAGE && (
                  <div className="px-6 py-4 border-t border-[#1F232B] flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-mono">
                      {lang === "vi"
                        ? `Hiển thị ${(campaignPage - 1) * CAMPAIGNS_PER_PAGE + 1}–${Math.min(campaignPage * CAMPAIGNS_PER_PAGE, filteredCampaigns.length)} / ${filteredCampaigns.length} chiến dịch`
                        : `Showing ${(campaignPage - 1) * CAMPAIGNS_PER_PAGE + 1}–${Math.min(campaignPage * CAMPAIGNS_PER_PAGE, filteredCampaigns.length)} of ${filteredCampaigns.length} campaigns`}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Previous */}
                      <button
                        onClick={() => setCampaignPage((p) => Math.max(1, p - 1))}
                        disabled={campaignPage === 1}
                        className={`px-2.5 py-1.5 rounded text-[11px] font-mono font-semibold transition-all ${
                          campaignPage === 1
                            ? "text-gray-600 cursor-not-allowed"
                            : "text-gray-300 hover:bg-[#1E232F] hover:text-white"
                        }`}
                      >
                        ‹
                      </button>

                      {/* Page Numbers */}
                      {(() => {
                        const pages: (number | string)[] = [];
                        const total = totalCampaignPages;
                        const current = campaignPage;

                        if (total <= 7) {
                          for (let i = 1; i <= total; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (current > 3) pages.push("...");
                          const start = Math.max(2, current - 1);
                          const end = Math.min(total - 1, current + 1);
                          for (let i = start; i <= end; i++) pages.push(i);
                          if (current < total - 2) pages.push("...");
                          pages.push(total);
                        }

                        return pages.map((page, idx) =>
                          page === "..." ? (
                            <span key={`ellipsis-${idx}`} className="px-1.5 text-gray-600 text-[11px] font-mono">
                              ···
                            </span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => setCampaignPage(page as number)}
                              className={`min-w-[32px] h-[32px] flex items-center justify-center rounded text-[11px] font-mono font-semibold transition-all ${
                                campaignPage === page
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                  : "text-gray-400 hover:bg-[#1E232F] hover:text-white"
                              }`}
                            >
                              {page}
                            </button>
                          )
                        );
                      })()}

                      {/* Next */}
                      <button
                        onClick={() => setCampaignPage((p) => Math.min(totalCampaignPages, p + 1))}
                        disabled={campaignPage === totalCampaignPages}
                        className={`px-2.5 py-1.5 rounded text-[11px] font-mono font-semibold transition-all ${
                          campaignPage === totalCampaignPages
                            ? "text-gray-600 cursor-not-allowed"
                            : "text-gray-300 hover:bg-[#1E232F] hover:text-white"
                        }`}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Products */}
            {activeTab === "products" && (
              <div className="flex flex-col gap-6 w-full animate-fadeIn">
                {/* 1. Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Hero Product Card */}
                  <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-3xl">🏆</span>
                    </div>
                    <span className="text-gray-400 text-[10px] font-mono font-medium tracking-wide uppercase">
                      {lang === "vi" ? "Sản phẩm Bán chạy nhất (GMV)" : "Top Hero Product (GMV)"}
                    </span>
                    {productMetrics.heroProduct ? (
                      <div className="mt-2.5">
                        <span className="font-bold text-white text-xs block truncate max-w-[280px]" title={productMetrics.heroProduct.name}>
                          {productMetrics.heroProduct.name}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-emerald-400 font-mono">
                            {formatVND(productMetrics.heroProduct.gmv)}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            ROI: {productMetrics.heroProduct.roi.toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-550 text-xs mt-2 font-mono">
                        {lang === "vi" ? "Chưa có dữ liệu" : "No data available"}
                      </span>
                    )}
                  </div>

                  {/* Underperforming Product Card */}
                  <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-3xl">降低</span>
                    </div>
                    <span className="text-gray-400 text-[10px] font-mono font-medium tracking-wide uppercase">
                      {lang === "vi" ? "Sản phẩm Hiệu suất kém (ROI Thấp)" : "Underperforming (Low ROI)"}
                    </span>
                    {productMetrics.worstProduct ? (
                      <div className="mt-2.5">
                        <span className="font-bold text-white text-xs block truncate max-w-[280px]" title={productMetrics.worstProduct.name}>
                          {productMetrics.worstProduct.name}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-rose-400 font-mono">
                            ROI: {productMetrics.worstProduct.roi.toFixed(2)}x
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {lang === "vi" ? "Chi phí: " : "Spend: "}
                            {formatVND(productMetrics.worstProduct.spend)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-550 text-xs mt-2 font-mono">
                        {lang === "vi" ? "Không có sản phẩm ROI thấp" : "No underperforming products"}
                      </span>
                    )}
                  </div>

                  {/* Stock Alert Card */}
                  <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-3xl">⚠️</span>
                    </div>
                    <span className="text-gray-400 text-[10px] font-mono font-medium tracking-wide uppercase">
                      {lang === "vi" ? "Cảnh báo Tồn kho (< 10 sản phẩm)" : "Stock Warning (< 10 units)"}
                    </span>
                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className={`text-2xl font-black font-mono ${productMetrics.lowStockCount > 0 ? "text-amber-500 animate-pulse" : "text-emerald-400"}`}>
                        {productMetrics.lowStockCount}
                      </span>
                      <span className="text-gray-400 text-[10px] font-mono">
                        {lang === "vi" ? "mặt hàng sắp hết hàng" : "items running low"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive Data Table and Filtering Panel */}
                <div className="bg-[#111318] border border-[#1F232B] rounded-lg overflow-hidden">
                  {/* Table Header / Filter Panel */}
                  <div className="px-6 py-4 border-b border-[#1F232B] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                      <h3 className="text-sm font-semibold text-white">
                        {lang === "vi" ? "Báo cáo Chi tiết Sản phẩm" : "Product Performance Ledger"}
                      </h3>
                      {/* Search Bar */}
                      <input
                        type="text"
                        placeholder={lang === "vi" ? "Tìm theo tên, ID, SKU..." : "Search by name, ID, SKU..."}
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="bg-[#15181F] text-gray-300 text-[11px] border border-[#2B303C] rounded px-3 py-1.5 outline-none focus:border-indigo-500 w-52 transition-all"
                      />
                      
                      {/* Stock Filter Checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-gray-400 hover:text-gray-200">
                        <input
                          type="checkbox"
                          checked={productStockFilter}
                          onChange={(e) => setProductStockFilter(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-[#2B303C] bg-[#15181F] checked:bg-indigo-600 outline-none cursor-pointer"
                        />
                        <span>{lang === "vi" ? "Sắp hết hàng (< 10)" : "Low Stock (< 10)"}</span>
                      </label>
                    </div>

                    {/* Sorting Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      <span className="text-[10px] text-gray-500 font-mono">{lang === "vi" ? "SẮP XẾP:" : "SORT BY:"}</span>
                      <select
                        value={productSortBy}
                        onChange={(e) => setProductSortBy(e.target.value)}
                        className="bg-[#15181F] text-gray-300 text-[11px] border border-[#2B303C] rounded px-2.5 py-1.5 cursor-pointer outline-none hover:border-indigo-500 transition-colors"
                      >
                        <option value="gmv">GMV</option>
                        <option value="spend">{lang === "vi" ? "Chi phí" : "Spend"}</option>
                        <option value="roi">ROI</option>
                        <option value="stock">{lang === "vi" ? "Tồn kho" : "Stock"}</option>
                        <option value="name">{lang === "vi" ? "Tên sản phẩm" : "Product Name"}</option>
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => setProductSortOrder(productSortOrder === "asc" ? "desc" : "asc")}
                        className="p-1.5 rounded bg-[#15181F] border border-[#2B303C] hover:border-indigo-500 text-gray-400 hover:text-white transition-colors"
                        title={productSortOrder === "asc" ? "Ascending" : "Descending"}
                      >
                        {productSortOrder === "asc" ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#151820] text-gray-400 border-b border-[#1F232B] font-mono text-[10px] uppercase select-none">
                          <th className="px-6 py-3 font-semibold">{lang === "vi" ? "Sản phẩm / Mã hàng" : "Product Details"}</th>
                          <th className="px-6 py-3 font-semibold">{lang === "vi" ? "Cửa hàng" : "Shop"}</th>
                          <th className="px-6 py-3 font-semibold text-center">{lang === "vi" ? "Tồn kho" : "Stock"}</th>
                          <th className="px-6 py-3 font-semibold text-right">{lang === "vi" ? "Chi phí" : "Spend"}</th>
                          <th className="px-6 py-3 font-semibold text-right">GMV</th>
                          <th className="px-6 py-3 font-semibold text-center">ROI</th>
                          <th className="px-6 py-3 font-semibold text-center">{lang === "vi" ? "Đơn" : "Orders"}</th>
                          <th className="px-6 py-3 font-semibold text-center">{lang === "vi" ? "Đề xuất tối ưu (AI)" : "AI Optimizer suggestion"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F232B]">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-mono">
                              {lang === "vi" ? "Không tìm thấy sản phẩm nào phù hợp với bộ lọc." : "No products found matching filters."}
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((p: any) => {
                            // Compute stock health
                            const isCritical = p.stock < 10;
                            const isWarning = p.stock >= 10 && p.stock < 20;
                            
                            // Compute ROI rating class and recommendations
                            let ratingText = lang === "vi" ? "Trung bình" : "Average";
                            let ratingColor = "bg-gray-900 text-gray-400 border border-gray-800/40";
                            let recommendationText = "";
                            let recommendationIcon = "";
                            
                            if (p.roi >= 3.0) {
                              ratingText = lang === "vi" ? "Tốt" : "High ROI";
                              ratingColor = "bg-emerald-950/70 text-emerald-400 border border-emerald-800/30";
                              recommendationText = lang === "vi" ? "Tăng ngân sách quảng cáo" : "Scale Ads Budget";
                              recommendationIcon = "🚀";
                            } else if (p.roi > 0 && p.roi < 2.0) {
                              ratingText = lang === "vi" ? "Kém" : "Low ROI";
                              ratingColor = "bg-rose-950/70 text-rose-400 border border-rose-800/30";
                              recommendationText = lang === "vi" ? "Giảm chi phí / Thay video" : "Reduce Spend / Swap Video";
                              recommendationIcon = "📉";
                            }
                            
                            if (p.stock < 10) {
                              recommendationText = lang === "vi" ? "Cần nhập hàng khẩn cấp" : "Restock units immediately";
                              recommendationIcon = "⚠️";
                            }

                            return (
                              <tr key={p.id} className="hover:bg-[#151820]/45 transition-colors">
                                {/* Product details */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-[#1A1D26] border border-[#2B303C]/35 flex-shrink-0 flex items-center justify-center text-sm">
                                      📦
                                    </div>
                                    <div className="max-w-[200px]">
                                      <span className="font-semibold text-white block truncate" title={p.name}>
                                        {p.name}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono text-gray-500">
                                        <span>ID: {p.productId}</span>
                                        {p.sku && (
                                          <>
                                            <span>•</span>
                                            <span className="text-gray-405 truncate max-w-[80px]">SKU: {p.sku}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Shop name */}
                                <td className="px-6 py-4 font-medium text-gray-300 max-w-[120px] truncate" title={p.shopName}>
                                  {p.shopName}
                                </td>

                                {/* Stock with Progress Bar */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-center justify-center gap-1 w-20 mx-auto">
                                    <span className={`font-mono text-xs font-bold ${
                                      isCritical ? "text-rose-400" : isWarning ? "text-amber-500" : "text-emerald-400"
                                    }`}>
                                      {p.stock}
                                    </span>
                                    <div className="h-1.5 w-full bg-[#1F232B] rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${
                                        isCritical ? "bg-rose-500 animate-pulse" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                                      }`} style={{ width: `${Math.min(100, p.stock * 5)}%` }} />
                                    </div>
                                  </div>
                                </td>

                                {/* Spend */}
                                <td className="px-6 py-4 text-right font-mono text-gray-400">
                                  {formatVND(p.spend)}
                                </td>

                                {/* GMV */}
                                <td className="px-6 py-4 text-right font-mono text-white font-semibold">
                                  {formatVND(p.gmv)}
                                </td>

                                {/* ROI Badge */}
                                <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className={`font-mono font-bold ${p.roi >= 3.5 ? "text-emerald-400" : p.roi > 0 ? "text-rose-400" : "text-gray-500"}`}>
                                      {p.roi > 0 ? `${p.roi.toFixed(2)}x` : "-"}
                                    </span>
                                    {p.roi > 0 && (
                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-sans scale-[0.85] ${ratingColor}`}>
                                        {ratingText}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Orders count */}
                                <td className="px-6 py-4 text-center font-mono text-gray-355">
                                  {p.orders}
                                </td>

                                {/* AI Recommendation Tag */}
                                <td className="px-6 py-4">
                                  {recommendationText ? (
                                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold border justify-center max-w-[210px] mx-auto text-center ${
                                      p.stock < 10 
                                        ? "bg-amber-950/40 text-amber-400 border-amber-800/35 shadow-sm shadow-amber-950/20" 
                                        : p.roi >= 3.0 
                                        ? "bg-indigo-950/40 text-indigo-400 border-indigo-850/30 shadow-sm shadow-indigo-950/20" 
                                        : "bg-rose-950/40 text-rose-400 border-rose-850/30 shadow-sm shadow-rose-950/20"
                                    }`}>
                                      <span>{recommendationIcon}</span>
                                      <span className="truncate">{recommendationText}</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-600 text-[10px] font-mono block text-center">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Creatives */}
            {activeTab === "creatives" && (
              <div className="flex flex-col gap-6 w-full animate-fadeIn">
                {/* 1. Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Top Viral Video Card */}
                  <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-3xl">🔥</span>
                    </div>
                    <span className="text-gray-400 text-[10px] font-mono font-medium tracking-wide uppercase">
                      {lang === "vi" ? "Video đột phá nhất (GMV)" : "Top Performing Video (GMV)"}
                    </span>
                    {creativeMetrics.topViralVideo ? (
                      <div className="mt-2.5">
                        <span className="font-bold text-white text-xs block truncate max-w-[280px]" title={creativeMetrics.topViralVideo.name}>
                          {creativeMetrics.topViralVideo.name}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-cyan-400 font-mono">
                            {formatVND(creativeMetrics.topViralVideo.gmv)}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            ROI: {creativeMetrics.topViralVideo.roi.toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-550 text-xs mt-2 font-mono">
                        {lang === "vi" ? "Chưa có dữ liệu" : "No data available"}
                      </span>
                    )}
                  </div>

                  {/* Underperforming Creative Card */}
                  <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-3xl">📉</span>
                    </div>
                    <span className="text-gray-400 text-[10px] font-mono font-medium tracking-wide uppercase">
                      {lang === "vi" ? "Video cần thay thế (ROI Thấp)" : "Lowest ROI Video"}
                    </span>
                    {creativeMetrics.worstVideo ? (
                      <div className="mt-2.5">
                        <span className="font-bold text-white text-xs block truncate max-w-[280px]" title={creativeMetrics.worstVideo.name}>
                          {creativeMetrics.worstVideo.name}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-rose-400 font-mono">
                            ROI: {creativeMetrics.worstVideo.roi.toFixed(2)}x
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {lang === "vi" ? "Chi phí: " : "Spend: "}
                            {formatVND(creativeMetrics.worstVideo.spend)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-550 text-xs mt-2 font-mono">
                        {lang === "vi" ? "Không có video hiệu quả kém" : "No underperforming videos"}
                      </span>
                    )}
                  </div>

                  {/* Average CTR Card */}
                  <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-3xl">🎯</span>
                    </div>
                    <span className="text-gray-400 text-[10px] font-mono font-medium tracking-wide uppercase">
                      {lang === "vi" ? "Tỷ lệ Click Trung bình (CTR)" : "Average Video CTR"}
                    </span>
                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        {(creativeMetrics.averageCtr * 100).toFixed(2)}%
                      </span>
                      <span className="text-gray-400 text-[10px] font-mono">
                        {lang === "vi" ? "tương tác nội dung video" : "video interaction rate"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive Data Table and Filtering Panel */}
                <div className="bg-[#111318] border border-[#1F232B] rounded-lg overflow-hidden">
                  {/* Table Header / Filter Panel */}
                  <div className="px-6 py-4 border-b border-[#1F232B] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <h3 className="text-sm font-semibold text-white">
                        {lang === "vi" ? "Báo cáo Chi tiết Hiệu suất Video" : "Video Performance Ledger"}
                      </h3>
                      {/* Search Bar */}
                      <input
                        type="text"
                        placeholder={lang === "vi" ? "Tìm theo tên, ID video..." : "Search by name, video ID..."}
                        value={creativeSearchQuery}
                        onChange={(e) => setCreativeSearchQuery(e.target.value)}
                        className="bg-[#15181F] text-gray-300 text-[11px] border border-[#2B303C] rounded px-3 py-1.5 outline-none focus:border-indigo-500 w-60 transition-all"
                      />

                      {/* Filter by Channel Type */}
                      <select
                        value={creativeChannelFilter}
                        onChange={(e) => setCreativeChannelFilter(e.target.value as any)}
                        className="bg-[#15181F] text-gray-300 text-[11px] border border-[#2B303C] rounded px-2.5 py-1.5 cursor-pointer outline-none hover:border-indigo-500 transition-colors"
                      >
                        <option value="ALL">{lang === "vi" ? "Tất cả kênh" : "All Channels"}</option>
                        <option value="INHOUSE">{lang === "vi" ? "🏢 Kênh In-house" : "In-house Only"}</option>
                        <option value="AFFILIATE">{lang === "vi" ? "✨ Kênh Affiliate (KOC)" : "Affiliate Only"}</option>
                      </select>
                    </div>

                    {/* Sorting Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      <span className="text-[10px] text-gray-500 font-mono">{lang === "vi" ? "SẮP XẾP:" : "SORT BY:"}</span>
                      <select
                        value={creativeSortBy}
                        onChange={(e) => setCreativeSortBy(e.target.value)}
                        className="bg-[#15181F] text-gray-300 text-[11px] border border-[#2B303C] rounded px-2.5 py-1.5 cursor-pointer outline-none hover:border-indigo-500 transition-colors"
                      >
                        <option value="gmv">GMV</option>
                        <option value="spend">{lang === "vi" ? "Chi phí" : "Spend"}</option>
                        <option value="roi">ROI</option>
                        <option value="ctr">CTR</option>
                        <option value="orders">{lang === "vi" ? "Đơn hàng" : "Orders"}</option>
                        <option value="name">{lang === "vi" ? "Tên video" : "Video Name"}</option>
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => setCreativeSortOrder(creativeSortOrder === "asc" ? "desc" : "asc")}
                        className="p-1.5 rounded bg-[#15181F] border border-[#2B303C] hover:border-indigo-500 text-gray-400 hover:text-white transition-colors"
                        title={creativeSortOrder === "asc" ? "Ascending" : "Descending"}
                      >
                        {creativeSortOrder === "asc" ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#151820] text-gray-400 border-b border-[#1F232B] font-mono text-[10px] uppercase select-none">
                          <th className="px-6 py-3 font-semibold">{lang === "vi" ? "Video / Mã ID" : "Video Details"}</th>
                          <th className="px-6 py-3 font-semibold">{lang === "vi" ? "Tài khoản quảng cáo" : "Ad Account"}</th>
                          <th className="px-6 py-3 font-semibold text-center">{lang === "vi" ? "Tỷ lệ Click (CTR)" : "CTR"}</th>
                          <th className="px-6 py-3 font-semibold text-right">{lang === "vi" ? "Chi phí" : "Spend"}</th>
                          <th className="px-6 py-3 font-semibold text-right">GMV</th>
                          <th className="px-6 py-3 font-semibold text-center">ROI</th>
                          <th className="px-6 py-3 font-semibold text-center">{lang === "vi" ? "Đơn" : "Orders"}</th>
                          <th className="px-6 py-3 font-semibold text-center">{lang === "vi" ? "Khuyến nghị tối ưu (AI)" : "AI Recommendation"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F232B]">
                        {filteredCreatives.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-mono">
                              {lang === "vi" ? "Không tìm thấy video quảng cáo nào phù hợp." : "No videos found matching filters."}
                            </td>
                          </tr>
                        ) : (
                          filteredCreatives.map((c: any) => {
                            // Compute CTR health
                            const ctrPercent = (c.ctr || 0) * 100;
                            const isHighCtr = ctrPercent >= 3.0;
                            const isMediumCtr = ctrPercent >= 1.5 && ctrPercent < 3.0;
                            const isLowCtr = ctrPercent < 1.5;

                            // Compute ROI rating class and recommendations
                            let ratingText = lang === "vi" ? "Trung bình" : "Average";
                            let ratingColor = "bg-gray-900 text-gray-400 border border-gray-800/40";
                            let recommendationText = "";
                            let recommendationIcon = "";
                            
                            if (c.roi >= 3.0) {
                              ratingText = lang === "vi" ? "Tốt" : "High ROI";
                              ratingColor = "bg-emerald-950/70 text-emerald-400 border border-emerald-800/30";
                              recommendationText = lang === "vi" ? "Tăng ngân sách quảng cáo" : "Scale Ads Budget";
                              recommendationIcon = "🚀";
                            } else if (c.roi > 0 && c.roi < 2.0) {
                              ratingText = lang === "vi" ? "Kém" : "Low ROI";
                              ratingColor = "bg-rose-950/70 text-rose-400 border border-rose-800/30";
                              recommendationText = lang === "vi" ? "Dừng quảng cáo / Thay video" : "Stop Creative / Swap Video";
                              recommendationIcon = "🛑";
                            }

                            if (c.ctr < 0.015 && c.spend > 0 && c.roi >= 2.0) {
                              recommendationText = lang === "vi" ? "Thay đổi 3 giây đầu (Hook)" : "Optimize Hook (3s First)";
                              recommendationIcon = "🪝";
                            }

                            return (
                              <tr key={c.id} className="hover:bg-[#151820]/45 transition-colors">
                                {/* Video details */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <a
                                      href={c.videoUrl || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-8 h-8 rounded bg-[#1A1D26] border border-[#2B303C]/35 flex-shrink-0 flex items-center justify-center text-xs hover:bg-[#202430] hover:border-indigo-500 transition-colors"
                                      title={lang === "vi" ? "Nhấn để phát video" : "Click to play video"}
                                    >
                                      ▶️
                                    </a>
                                    <div className="max-w-[200px]">
                                      <span className="font-semibold text-white block truncate" title={c.name}>
                                        {c.name}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCreativeChannel(c.id, c.channelType || "AFFILIATE")}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors flex items-center gap-1 ${
                                            c.channelType === "INHOUSE"
                                              ? "bg-emerald-950/70 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/60"
                                              : "bg-indigo-950/70 text-indigo-300 border-indigo-800/40 hover:bg-indigo-900/60"
                                          }`}
                                          title={lang === "vi" ? "Click để chuyển đổi giữa In-house và Affiliate" : "Toggle In-house / Affiliate"}
                                        >
                                          <span>{c.channelType === "INHOUSE" ? "🏢 In-house" : "✨ Affiliate"}</span>
                                          <span className="text-[8px] opacity-70">⇄</span>
                                        </button>
                                        {c.authorUsername && (
                                          <span className="text-[9px] font-mono text-gray-400 truncate max-w-[90px]" title={`@${c.authorUsername}`}>
                                            @{c.authorUsername}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] font-mono text-gray-500 block mt-0.5">
                                        ID: {c.videoId}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Advertiser name */}
                                <td className="px-6 py-4 font-medium text-gray-300 max-w-[150px] truncate" title={c.advertiserName}>
                                  {c.advertiserName}
                                </td>

                                {/* CTR with Progress Bar */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-center justify-center gap-1 w-20 mx-auto">
                                    <span className={`font-mono text-xs font-bold ${
                                      isHighCtr ? "text-emerald-400" : isMediumCtr ? "text-amber-500" : "text-rose-400"
                                    }`}>
                                      {ctrPercent.toFixed(2)}%
                                    </span>
                                    <div className="h-1.5 w-full bg-[#1F232B] rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${
                                        isHighCtr ? "bg-emerald-500" : isMediumCtr ? "bg-amber-500" : "bg-rose-500 animate-pulse"
                                      }`} style={{ width: `${Math.min(100, ctrPercent * 20)}%` }} />
                                    </div>
                                  </div>
                                </td>

                                {/* Spend */}
                                <td className="px-6 py-4 text-right font-mono text-gray-400">
                                  {formatVND(c.spend)}
                                </td>

                                {/* GMV */}
                                <td className="px-6 py-4 text-right font-mono text-white font-semibold">
                                  {formatVND(c.gmv)}
                                </td>

                                {/* ROI Badge */}
                                <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className={`font-mono font-bold ${c.roi >= 3.5 ? "text-emerald-400" : c.roi > 0 ? "text-rose-400" : "text-gray-500"}`}>
                                      {c.roi > 0 ? `${c.roi.toFixed(2)}x` : "-"}
                                    </span>
                                    {c.roi > 0 && (
                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-sans scale-[0.85] ${ratingColor}`}>
                                        {ratingText}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Orders count */}
                                <td className="px-6 py-4 text-center font-mono text-gray-300">
                                  {c.orders}
                                </td>

                                {/* AI Recommendation Tag */}
                                <td className="px-6 py-4">
                                  {recommendationText ? (
                                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold border justify-center max-w-[210px] mx-auto text-center ${
                                      c.roi < 2.0 && c.spend > 0
                                        ? "bg-rose-950/40 text-rose-400 border-rose-850/30 shadow-sm shadow-rose-950/20" 
                                        : c.roi >= 3.0 
                                        ? "bg-indigo-950/40 text-indigo-400 border-indigo-850/30 shadow-sm shadow-indigo-950/20" 
                                        : "bg-amber-950/40 text-amber-400 border-amber-800/35 shadow-sm shadow-amber-950/20"
                                    }`}>
                                      <span>{recommendationIcon}</span>
                                      <span className="truncate">{recommendationText}</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-600 text-[10px] font-mono block text-center">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Alerts */}
            {activeTab === "alerts" && (
              <div className="bg-[#111318] border border-[#1F232B] rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1F232B]">
                  <h3 className="text-sm font-semibold text-white">{t.anomalyLog}</h3>
                </div>
                <div className="divide-y divide-[#1F232B]">
                  {alerts.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500 font-mono">
                      {t.noAlerts}
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${
                        alert.status === "UNRESOLVED" ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-[#151820]/45"
                      }`}>
                        <div className="flex gap-3">
                          <span className={`text-xl mt-0.5 ${alert.type === "LOW_STOCK" ? "text-amber-500" : "text-rose-500"}`}>
                            {alert.type === "LOW_STOCK" ? "⚠️" : "🚨"}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{alert.type}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{t.rule}: {alert.rule}</span>
                            </div>
                            <p className="text-xs text-gray-300 mt-1">{alert.message}</p>
                            <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                              {t.shop}: {alert.shop?.name} | {new Date(alert.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div>
                          {alert.status === "UNRESOLVED" ? (
                            <div className="flex gap-2">
                              {(() => {
                                const match = alert.message.match(/\[CAMPAIGN_ID:(.*?)\]/);
                                const alertCampaignId = match ? match[1] : null;
                                return alert.type === "LOW_ROI_RELAUNCH_RECOMMENDATION" && alertCampaignId ? (
                                  <button
                                    onClick={() => handleRelaunchCampaign(alertCampaignId, alert.id)}
                                    disabled={relaunchingId === alertCampaignId}
                                    className="px-3 py-1.5 rounded bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/30 text-[10px] font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
                                  >
                                    {relaunchingId === alertCampaignId ? (lang === "vi" ? "Đang lên..." : "Relaunching...") : (lang === "vi" ? "Tắt & Lên lại V2" : "Relaunch V2")}
                                  </button>
                                ) : null;
                              })()}
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                className="px-3 py-1.5 rounded bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-800/30 text-[10px] font-bold tracking-wider uppercase transition-colors"
                              >
                                {t.resolve}
                              </button>
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 rounded bg-[#1A2E26] text-emerald-400 border border-emerald-800/30 text-[10px] font-bold tracking-wider uppercase">
                              {t.resolved}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: AI recommendations & Comprehensive Audit */}
            {activeTab === "ai" && (
              <div className="flex flex-col gap-6 w-full">
                {/* AI Configuration Bar */}
                <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-white">
                      {lang === "vi" ? "Trợ lý Phân tích AI Toàn diện (Gemini AI)" : "Comprehensive AI Audit Assistant (Gemini)"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lang === "vi" 
                        ? "Đọc toàn bộ chỉ số chiến dịch, sản phẩm, video của shop để tìm vấn đề và đưa ra giải pháp tối ưu."
                        : "Analyze all campaigns, products, and creatives of the shop to identify issues and formulate optimization actions."}
                    </p>
                  </div>
                  
                  {/* API Key settings right on the page */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1 w-52 sm:w-64">
                      <input
                        type="password"
                        placeholder={lang === "vi" ? "Nhập Gemini API Key..." : "Enter Gemini API Key..."}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2 outline-none focus:border-indigo-500 transition-colors w-full font-mono"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveApiKey(geminiApiKey)}
                      className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0 shadow-md shadow-indigo-600/10"
                    >
                      {lang === "vi" ? "Lưu Key" : "Save Key"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                  {/* Left Main Workspace: Runs Audit & Displays Audit Report */}
                  <div className="xl:col-span-3 flex flex-col gap-6">
                    {/* Run Action Card */}
                    <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-500" />
                      
                      <div className="w-12 h-12 rounded-full bg-indigo-950/40 border border-indigo-800/30 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/5">
                        🤖
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {lang === "vi" ? "Báo cáo Phân tích Chiến dịch Shop" : "Shop Campaigns Diagnostic Audit"}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1 max-w-lg">
                          {lang === "vi"
                            ? "AI sẽ quét toàn bộ dữ liệu ngày hôm nay, so sánh tỷ lệ ROI, CTR, chi tiêu ngân sách với mục tiêu của shop để phát hiện vấn đề."
                            : "The AI will scan today's data, check ROI, CTR, budget metrics against shop configurations, and draft a professional recommendations blueprint."}
                        </p>
                      </div>

                      {isAuditing ? (
                        <div className="flex flex-col items-center gap-3 py-4 w-full max-w-md">
                          <div className="flex gap-1.5 justify-center items-center">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          
                          <div className="text-xs font-mono text-indigo-400 bg-indigo-950/20 px-4 py-1.5 rounded-full border border-indigo-900/40 animate-pulse">
                            {auditStep === 1 && (lang === "vi" ? "Step 1/4: Đang kết nối cơ sở dữ liệu và tổng hợp chỉ số..." : "Step 1/4: Connecting database & aggregating metrics...")}
                            {auditStep === 2 && (lang === "vi" ? "Step 2/4: Đang đánh giá hiệu suất ROI chiến dịch & sản phẩm..." : "Step 2/4: Computing campaign ROI & product conversion statistics...")}
                            {auditStep === 3 && (lang === "vi" ? "Step 3/4: Đang gửi dữ liệu tới Gemini AI để phân tích..." : "Step 3/4: Transferring context payload to Gemini AI...")}
                            {auditStep === 4 && (lang === "vi" ? "Step 4/4: Đang biên soạn giải pháp và lập kế hoạch tối ưu..." : "Step 4/4: Compiling solutions blueprint...")}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={handleRunAiAudit}
                          disabled={!selectedShop}
                          className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-indigo-800 disabled:to-indigo-900 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                        >
                          ✨ {lang === "vi" ? "BẮT ĐẦU CHẨN ĐOÁN AI" : "RUN AI DIAGNOSTICS"}
                        </button>
                      )}
                    </div>

                    {/* Display Generated Report if available */}
                    {auditReport && (
                      <div className="bg-[#111318] border border-[#1F232B] rounded-lg overflow-hidden flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-[#1F232B] flex items-center justify-between gap-4 bg-[#14171E]">
                          <div className="flex items-center gap-2">
                            <span className="text-base">📋</span>
                            <span className="text-xs font-bold font-mono tracking-wider text-indigo-400 uppercase">
                              {lang === "vi" ? "KẾT QUẢ PHÂN TÍCH VÀ ĐỀ XUẤT" : "DIAGNOSTIC REPORT & ACTION ITEMS"}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleCopyText(auditReport, lang === "vi" ? "Báo cáo AI" : "AI Report")}
                            className="px-3 py-1.5 rounded bg-[#1D202A] hover:bg-[#282C3A] border border-[#2B303C]/70 text-gray-300 hover:text-white font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1.5"
                          >
                            <span>📋</span> {lang === "vi" ? "SAO CHÉP MARKDOWN" : "COPY MARKDOWN"}
                          </button>
                        </div>
                        
                        <div className="p-6 md:p-8 overflow-y-auto max-h-[800px] prose prose-invert max-w-none divide-y divide-[#1F232B]/50">
                          {renderMarkdown(auditReport)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Sidebar: Past Reports List & Quick rules list */}
                  <div className="flex flex-col gap-6">
                    {/* Past Reports List */}
                    <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                        {lang === "vi" ? "Lịch sử chẩn đoán" : "Diagnostic History"}
                      </h4>
                      
                      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {auditHistory.length === 0 ? (
                          <div className="text-center py-8 text-gray-600 text-xs font-mono border border-dashed border-[#1F232B] rounded-lg">
                            {lang === "vi" ? "Không có lịch sử chẩn đoán nào." : "No audit history recorded."}
                          </div>
                        ) : (
                          auditHistory.map((item) => (
                            <div 
                              key={item.id} 
                              className={`group border rounded-lg p-3 flex flex-col gap-1.5 transition-all cursor-pointer ${
                                auditReport === item.report 
                                  ? "bg-indigo-950/20 border-indigo-500/40 hover:bg-indigo-950/30" 
                                  : "bg-[#15181F] border-[#1E232F] hover:bg-[#1A1E27] hover:border-gray-800"
                              }`}
                              onClick={() => setAuditReport(item.report)}
                            >
                              <div className="flex items-start justify-between gap-2 bg-transparent">
                                <span className="font-semibold text-xs text-white truncate max-w-[130px]">
                                  {item.shopName}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAudit(item.id);
                                  }}
                                  className="text-gray-500 hover:text-rose-400 transition-colors text-[10px] opacity-0 group-hover:opacity-100 p-0.5"
                                  title={lang === "vi" ? "Xóa" : "Delete"}
                                >
                                  🗑️
                                </button>
                              </div>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {item.timestamp}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Quick Rules recommendations */}
                    <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-5 flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                        {lang === "vi" ? "Khuyến nghị nhanh dựa trên luật" : "Quick Rule Recommendations"}
                      </h4>
                      
                      <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                        {recommendations.length === 0 ? (
                          <div className="text-center py-8 text-gray-600 text-xs font-mono border border-dashed border-[#1F232B] rounded-lg">
                            {lang === "vi" ? "Không có khuyến nghị nhanh." : "No quick recommendations."}
                          </div>
                        ) : (
                          recommendations.map((rec) => (
                            <div key={rec.id} className="bg-[#15181F] border border-[#1E232F] rounded-lg p-3.5 flex flex-col gap-2 hover:border-gray-800 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-white text-[10px] truncate max-w-[140px]">{rec.campaignName}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 ${
                                  rec.priority === "HIGH"
                                    ? "bg-red-950 text-red-400"
                                    : rec.priority === "MEDIUM"
                                    ? "bg-amber-950 text-amber-400"
                                    : "bg-gray-850 text-gray-500"
                                }`}>
                                  {rec.priority}
                                </span>
                              </div>
                              <span className="text-[9px] text-indigo-400 font-mono font-bold block">{rec.action}</span>
                              <p className="text-[10px] text-gray-300 leading-relaxed">{rec.reason}</p>
                              <p className="text-[9px] text-gray-500 italic leading-relaxed">{rec.details}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6: Account Settings */}
            {activeTab === "settings" && (
              <div className="flex flex-col gap-8 w-full">
                {/* 1. Shop Management Panel */}
                <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-6 flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {lang === "vi" ? "Quản lý Cửa hàng (Shops)" : "Shop Management"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {lang === "vi"
                        ? "Thêm cửa hàng mới, đổi tên hoặc xóa các cửa hàng hiện có. Các thay đổi sẽ cập nhật trực tiếp lên bộ chọn bộ lọc."
                        : "Add new shops, rename or delete existing shops. Changes will update the filter selectors automatically."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add new shop form */}
                    <form onSubmit={handleAddShop} className="bg-[#15181F] border border-[#1E232F] rounded-lg p-4 flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
                        {lang === "vi" ? "Thêm Cửa hàng mới" : "Add New Shop"}
                      </h4>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">
                            {lang === "vi" ? "TÊN CỬA HÀNG" : "SHOP NAME"}
                          </label>
                          <input
                            type="text"
                            placeholder={lang === "vi" ? "Ví dụ: Alpha Fashion Shop" : "e.g., Alpha Fashion Shop"}
                            value={newShopName}
                            onChange={(e) => setNewShopName(e.target.value)}
                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2 outline-none focus:border-indigo-500 transition-colors w-full"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">
                            TIKTOK SHOP ID (UNIQUE)
                          </label>
                          <input
                            type="text"
                            placeholder="Ví dụ: TS_SHOP_ALPHA"
                            value={newShopTiktokId}
                            onChange={(e) => setNewShopTiktokId(e.target.value)}
                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2 outline-none focus:border-indigo-500 transition-colors w-full"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">
                            {lang === "vi" ? "ROI TỐI THIỂU TỰ ĐỘNG LÊN CAMP" : "AUTO-RELAUNCH ROI THRESHOLD"}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="10"
                            value={newShopRoi}
                            onChange={(e) => setNewShopRoi(e.target.value)}
                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2 outline-none focus:border-indigo-500 transition-colors w-full font-mono"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">
                            {lang === "vi" ? "CHI TIÊU TỐI THIỂU (VND)" : "MIN SPEND (VND)"}
                          </label>
                          <input
                            type="text"
                            value={formatNumberString(newShopMinSpend)}
                            onChange={(e) => setNewShopMinSpend(e.target.value.replace(/\D/g, ""))}
                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2 outline-none focus:border-indigo-500 transition-colors w-full font-mono"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-gray-400 font-mono">
                            {lang === "vi" ? "ĐƠN HÀNG TỐI ĐA" : "MAX ORDERS LIMIT"}
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={newShopMaxOrders}
                            onChange={(e) => setNewShopMaxOrders(e.target.value)}
                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2 outline-none focus:border-indigo-500 transition-colors w-full font-mono"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded py-2 transition-colors mt-1 shadow-md shadow-indigo-600/15"
                      >
                        {lang === "vi" ? "Thêm cửa hàng" : "Add Shop"}
                      </button>
                    </form>

                    {/* Shop List */}
                    <div className="lg:col-span-2 bg-[#15181F] border border-[#1E232F] rounded-lg p-4 flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                        {lang === "vi" ? "Danh sách Cửa hàng" : "Connected Shops"}
                      </h4>
                      <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                        {shops.length === 0 ? (
                          <div className="text-center py-8 text-gray-600 text-xs font-mono">
                            {lang === "vi" ? "Không có cửa hàng nào." : "No shops configured."}
                          </div>
                        ) : (
                          shops.map((shop) => (
                            <div key={shop.id} className="bg-[#0E1015] border border-[#1F232B] rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                              <div className="flex-1">
                                {editingShopId === shop.id ? (
                                  <div className="flex flex-col gap-2 w-full">
                                    <div className="flex flex-col gap-2">
                                      <input
                                        type="text"
                                        value={editingShopName}
                                        onChange={(e) => setEditingShopName(e.target.value)}
                                        className="bg-[#15181F] text-gray-200 text-xs border border-[#2B303C] rounded px-2.5 py-1 w-full outline-none focus:border-indigo-500"
                                        placeholder={lang === "vi" ? "Tên cửa hàng" : "Shop Name"}
                                        autoFocus
                                      />
                                      {/* Video config row */}
                                      <div className="flex flex-wrap items-center gap-2 p-2 bg-[#15181F] rounded border border-[#2B303C]/70">
                                        <span className="text-[10px] font-bold text-indigo-400 font-mono shrink-0">🎬 Video:</span>
                                        <button
                                          type="button"
                                          onClick={() => setEditingShopVideoEnabled(!editingShopVideoEnabled)}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${
                                            editingShopVideoEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-800 text-gray-500 border border-gray-700"
                                          }`}
                                        >
                                          {editingShopVideoEnabled ? "✓ BẬT" : "✕ TẮT"}
                                        </button>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-[10px] text-gray-400 font-mono">ROI &lt;</span>
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="10"
                                            value={editingShopVideoRoi}
                                            onChange={(e) => setEditingShopVideoRoi(e.target.value)}
                                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-1.5 py-0.5 w-12 outline-none focus:border-indigo-500 text-center font-mono"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-[10px] text-gray-400 font-mono">Spend ≥</span>
                                          <input
                                            type="text"
                                            value={formatNumberString(editingShopVideoMinSpend)}
                                            onChange={(e) => setEditingShopVideoMinSpend(e.target.value.replace(/\D/g, ""))}
                                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-1.5 py-0.5 w-20 outline-none focus:border-indigo-500 text-center font-mono"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-[10px] text-gray-400 font-mono">Orders &lt;</span>
                                          <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={editingShopVideoMaxOrders}
                                            onChange={(e) => setEditingShopVideoMaxOrders(e.target.value)}
                                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-1.5 py-0.5 w-12 outline-none focus:border-indigo-500 text-center font-mono"
                                          />
                                        </div>
                                      </div>

                                      {/* Live config row */}
                                      <div className="flex flex-wrap items-center gap-2 p-2 bg-[#15181F] rounded border border-[#2B303C]/70">
                                        <span className="text-[10px] font-bold text-rose-400 font-mono shrink-0">🔴 LIVE:</span>
                                        <button
                                          type="button"
                                          onClick={() => setEditingShopLiveEnabled(!editingShopLiveEnabled)}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${
                                            editingShopLiveEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-800 text-gray-500 border border-gray-700"
                                          }`}
                                        >
                                          {editingShopLiveEnabled ? "✓ BẬT" : "✕ TẮT"}
                                        </button>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-[10px] text-gray-400 font-mono">ROI &lt;</span>
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="10"
                                            value={editingShopLiveRoi}
                                            onChange={(e) => setEditingShopLiveRoi(e.target.value)}
                                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-1.5 py-0.5 w-12 outline-none focus:border-indigo-500 text-center font-mono"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-[10px] text-gray-400 font-mono">Spend ≥</span>
                                          <input
                                            type="text"
                                            value={formatNumberString(editingShopLiveMinSpend)}
                                            onChange={(e) => setEditingShopLiveMinSpend(e.target.value.replace(/\D/g, ""))}
                                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-1.5 py-0.5 w-20 outline-none focus:border-indigo-500 text-center font-mono"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className="text-[10px] text-gray-400 font-mono">Orders &lt;</span>
                                          <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={editingShopLiveMaxOrders}
                                            onChange={(e) => setEditingShopLiveMaxOrders(e.target.value)}
                                            className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-1.5 py-0.5 w-12 outline-none focus:border-indigo-500 text-center font-mono"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleRenameShop(shop.id)}
                                        className="px-3 py-1 rounded bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/30 text-[10px] font-bold uppercase transition-colors"
                                      >
                                        {lang === "vi" ? "Lưu" : "Save"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingShopId(null);
                                          setEditingShopName("");
                                          setEditingShopRoi("3.0");
                                          setEditingShopMinSpend("200000");
                                          setEditingShopMaxOrders("20");
                                        }}
                                        className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700/30 text-[10px] font-bold uppercase transition-colors"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-white text-xs">{shop.name}</span>
                                    <div className="flex flex-col gap-1 mt-1">
                                      <span className="text-[10px] text-gray-500 font-mono">ID: {shop.tiktokShopId}</span>
                                      <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-300">
                                            🎬 Video: {shop.autoRelaunchVideoEnabled !== false ? `ROI < ${(shop.autoRelaunchVideoRoi ?? shop.autoRelaunchRoiThreshold ?? 3.0).toFixed(1)} | ≥ ${(shop.autoRelaunchVideoMinSpend ?? shop.autoRelaunchMinSpend ?? 200000).toLocaleString('vi-VN')}đ | < ${shop.autoRelaunchVideoMaxOrders ?? shop.autoRelaunchMaxOrders ?? 20} đơn` : (lang === "vi" ? "TẮT" : "OFF")}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="text-[10px] font-mono bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-rose-300">
                                            🔴 LIVE: {shop.autoRelaunchLiveEnabled !== false ? `ROI < ${(shop.autoRelaunchLiveRoi ?? shop.autoRelaunchRoiThreshold ?? 3.0).toFixed(1)} | ≥ ${(shop.autoRelaunchLiveMinSpend ?? shop.autoRelaunchMinSpend ?? 200000).toLocaleString('vi-VN')}đ | < ${shop.autoRelaunchLiveMaxOrders ?? shop.autoRelaunchMaxOrders ?? 20} đơn` : (lang === "vi" ? "TẮT" : "OFF")}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {editingShopId !== shop.id && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingShopId(shop.id);
                                      setEditingShopName(shop.name);
                                      setEditingShopRoi(shop.autoRelaunchRoiThreshold.toString());
                                      setEditingShopMinSpend((shop.autoRelaunchMinSpend ?? 200000).toString());
                                      setEditingShopMaxOrders((shop.autoRelaunchMaxOrders ?? 20).toString());

                                      setEditingShopVideoEnabled(shop.autoRelaunchVideoEnabled ?? true);
                                      setEditingShopVideoRoi((shop.autoRelaunchVideoRoi ?? shop.autoRelaunchRoiThreshold ?? 3.0).toString());
                                      setEditingShopVideoMinSpend((shop.autoRelaunchVideoMinSpend ?? shop.autoRelaunchMinSpend ?? 200000).toString());
                                      setEditingShopVideoMaxOrders((shop.autoRelaunchVideoMaxOrders ?? shop.autoRelaunchMaxOrders ?? 20).toString());

                                      setEditingShopLiveEnabled(shop.autoRelaunchLiveEnabled ?? true);
                                      setEditingShopLiveRoi((shop.autoRelaunchLiveRoi ?? shop.autoRelaunchRoiThreshold ?? 3.0).toString());
                                      setEditingShopLiveMinSpend((shop.autoRelaunchLiveMinSpend ?? shop.autoRelaunchMinSpend ?? 200000).toString());
                                      setEditingShopLiveMaxOrders((shop.autoRelaunchLiveMaxOrders ?? shop.autoRelaunchMaxOrders ?? 20).toString());
                                    }}
                                    className="p-1.5 rounded bg-indigo-950/40 text-indigo-400 hover:bg-indigo-900/50 border border-indigo-800/20 text-[10px] font-bold uppercase transition-colors"
                                    title={lang === "vi" ? "Sửa" : "Edit"}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShop(shop.id)}
                                    className="p-1.5 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900/50 border border-rose-800/20 text-[10px] font-bold uppercase transition-colors"
                                    title={lang === "vi" ? "Xóa" : "Delete"}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* 2. Link Ad Account via Auth Code */}
                <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-6 flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {lang === "vi" ? "Kết nối Tài khoản Quảng cáo qua Auth Code" : "Link Ad Account via Auth Code"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {lang === "vi"
                        ? "Nhập mã Ủy quyền (Auth Code) nhận được từ TikTok Ads để tự động kết nối các tài khoản quảng cáo mới."
                        : "Enter the Authorization Code (Auth Code) obtained from TikTok Ads to link new advertiser accounts."}
                    </p>
                  </div>

                  <form onSubmit={handleLinkNewAccount} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] text-gray-400 font-mono">
                        {lang === "vi" ? "MÃ ỦY QUYỀN (AUTH CODE)" : "AUTHORIZATION CODE (AUTH CODE)"}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          lang === "vi"
                            ? "Dán mã Auth Code tại đây (ví dụ: 8a5d7c8d9...)"
                            : "Paste Auth Code here (e.g., 8a5d7c8d9...)"
                        }
                        value={authCodeInput}
                        onChange={(e) => setAuthCodeInput(e.target.value)}
                        className="bg-[#15181F] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors w-full"
                        required
                        disabled={isLinkingAccount}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 font-mono">
                        {lang === "vi" ? "LIÊN KẾT VÀO SHOP" : "LINK TO SHOP"}
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={linkingAdShopId}
                          onChange={(e) => setLinkingAdShopId(e.target.value)}
                          className="bg-[#15181F] text-gray-300 text-xs border border-[#2B303C] rounded px-2.5 py-2.5 cursor-pointer outline-none focus:border-indigo-500 transition-colors w-full"
                          disabled={isLinkingAccount}
                        >
                          {shops.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={isLinkingAccount}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white px-5 py-2.5 rounded text-xs font-bold tracking-wide transition-all whitespace-nowrap flex items-center justify-center min-w-[120px]"
                        >
                          {isLinkingAccount ? (
                            <span className="flex items-center gap-1.5">
                              <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                              {lang === "vi" ? "Đang kết nối..." : "Linking..."}
                            </span>
                          ) : (
                            lang === "vi" ? "Kết nối" : "Connect"
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* 3. Ad Account Linking Panel */}
                <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-6 flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1F232B] pb-4 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {lang === "vi" ? "Cấu hình Tài khoản Quảng cáo" : "Configure Ad Accounts"}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {lang === "vi"
                          ? "Bật/Tắt đồng bộ tài khoản quảng cáo và liên kết chúng vào các cửa hàng tương ứng."
                          : "Enable/Disable account sync and link them to their corresponding shops."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleBulkToggle("ACTIVE")}
                        className="bg-emerald-950/65 text-emerald-400 border border-emerald-800/30 hover:bg-emerald-900/80 px-3 py-2 rounded text-xs font-semibold tracking-wide transition-all"
                      >
                        {lang === "vi" ? "Bật tất cả" : "Enable All"}
                      </button>
                      <button
                        onClick={() => handleBulkToggle("INACTIVE")}
                        className="bg-rose-950/65 text-rose-400 border border-rose-800/30 hover:bg-rose-900/80 px-3 py-2 rounded text-xs font-semibold tracking-wide transition-all mr-2"
                      >
                        {lang === "vi" ? "Tắt tất cả" : "Disable All"}
                      </button>
                      <input
                        type="text"
                        placeholder={lang === "vi" ? "Tìm kiếm tài khoản..." : "Search accounts..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#15181F] text-gray-300 text-xs border border-[#2B303C] rounded px-3 py-2 outline-none w-full md:w-64 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
                    {allAdvertisers
                      .filter((adv) =>
                        adv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        adv.advertiserId.includes(searchQuery)
                      )
                      .map((adv) => (
                        <div
                          key={adv.id}
                          className="bg-[#15181F] border border-[#1E232F] rounded-lg p-4 flex flex-col gap-4 hover:border-gray-800 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 w-[75%]">
                              <span className="font-semibold text-xs text-white truncate" title={adv.name}>
                                {adv.name}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                ID: {adv.advertiserId}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleAdvertiser(adv.advertiserId, adv.status)}
                              className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 flex items-center ${
                                adv.status === "ACTIVE"
                                  ? "bg-indigo-600 justify-end"
                                  : "bg-[#252833] justify-start border border-[#3E4357]/20"
                              }`}
                            >
                              <span className="w-5 h-5 bg-white rounded-full shadow-md transition-all" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#1E232F]/60 pt-3 gap-2">
                            <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">
                              {lang === "vi" ? "GẮN VÀO SHOP:" : "LINKED TO SHOP:"}
                            </span>
                            <select
                              value={adv.shopId || ""}
                              onChange={(e) => handleLinkAdvertiserToShop(adv.advertiserId, e.target.value)}
                              className="bg-[#0E1015] text-gray-300 text-xs border border-[#2B303C] rounded px-2.5 py-1.5 cursor-pointer outline-none hover:border-indigo-500 transition-colors max-w-[170px] truncate"
                            >
                              {!adv.shopId && (
                                <option value="" disabled>-- {lang === "vi" ? "Chọn Cửa hàng" : "Select Shop"} --</option>
                              )}
                              {shops.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 3. Change Password Panel */}
                <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-6 flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {lang === "vi" ? "Đổi mật khẩu bảo mật" : "Security Password Change"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {lang === "vi"
                        ? "Đổi mật khẩu truy cập hệ thống. Mật khẩu mới sẽ được mã hóa và lưu trữ trực tiếp trong cơ sở dữ liệu."
                        : "Change the system access password. The new password will be encrypted and stored in the database."}
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="bg-[#15181F] border border-[#1E232F] rounded-lg p-5 max-w-xl w-full flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Current Password */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                          {lang === "vi" ? "Mật khẩu hiện tại" : "Current Password"}
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors w-full"
                        />
                      </div>

                      {/* New Password */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                          {lang === "vi" ? "Mật khẩu mới" : "New Password"}
                        </label>
                        <input
                          type="password"
                          required
                          placeholder={lang === "vi" ? "Tối thiểu 6 ký tự" : "Min 6 characters"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors w-full"
                        />
                      </div>

                      {/* Confirm New Password */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                          {lang === "vi" ? "Xác nhận mật khẩu" : "Confirm Password"}
                        </label>
                        <input
                          type="password"
                          required
                          placeholder={lang === "vi" ? "Nhập lại mật khẩu" : "Confirm new password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors w-full"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="self-start px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950/40 disabled:text-indigo-400 disabled:border-indigo-900/30 text-white border border-indigo-500 rounded-lg text-xs font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
                    >
                      {isChangingPassword ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>{lang === "vi" ? "Đang xử lý..." : "Processing..."}</span>
                        </>
                      ) : (
                        <>
                          <span>🛡️</span>
                          <span>{lang === "vi" ? "Cập nhật mật khẩu" : "Update Password"}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "docs" && (
              <div className="bg-[#111318] border border-[#1F232B] rounded-lg p-6 md:p-8 animate-fadeIn shadow-sm">
                <div className="flex items-center justify-between border-b border-[#1F232B] pb-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {lang === "vi" ? "HƯỚNG DẪN SỬ DỤNG HỆ THỐNG" : "SYSTEM USER MANUAL"}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {lang === "vi" 
                        ? "Tài liệu hướng dẫn cài đặt, thiết lập tự động hóa và xử lý sự cố." 
                        : "Documentation for setup, automation rules, and troubleshooting."}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyText(docsContent, lang === "vi" ? "Tài liệu hướng dẫn" : "User Manual")}
                    className="px-3 py-1.5 bg-[#15181F] border border-[#2B303C] hover:border-indigo-500 rounded text-xs font-semibold text-gray-300 transition-all flex items-center gap-1.5 select-none"
                  >
                    <span>📋</span> {lang === "vi" ? "SAO CHÉP" : "COPY"}
                  </button>
                </div>
                <div className="max-w-none text-gray-200 leading-relaxed">
                  {docsContent ? (
                    renderMarkdown(docsContent)
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                      <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs text-gray-400 font-mono">
                        {lang === "vi" ? "Đang tải tài liệu hướng dẫn..." : "Loading manual..."}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 animate-slideIn max-w-sm w-full bg-[#111318]/95 backdrop-blur-md border rounded-lg shadow-2xl p-4 flex items-start gap-3 border-l-4 transition-all duration-300 ${
          toast.type === "success" ? "border-emerald-500 border-l-emerald-500 bg-[#0c1912]/95" :
          toast.type === "error" ? "border-rose-500 border-l-rose-500 bg-[#1c0d0f]/95" :
          toast.type === "warning" ? "border-amber-500 border-l-amber-500 bg-[#1c150d]/95" :
          "border-indigo-500 border-l-indigo-500 bg-[#0d121c]/95"
        }`}>
          <div className="text-lg">
            {toast.type === "success" && <span className="text-emerald-400">⚡</span>}
            {toast.type === "error" && <span className="text-rose-400">⚠️</span>}
            {toast.type === "warning" && <span className="text-amber-400">🔥</span>}
            {toast.type === "info" && <span className="text-indigo-400">ℹ️</span>}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-white leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-gray-500 hover:text-white transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#111318] border border-[#2B303C] rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-zoomIn">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg">
                  ❓
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {lang === "vi" ? "Xác nhận hành động" : "Confirm Action"}
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {confirmDlg.message}
              </p>
            </div>
            <div className="bg-[#151820] px-6 py-4 flex items-center justify-end gap-3 border-t border-[#1F232B]">
              <button
                onClick={() => {
                  confirmDlg.resolve(false);
                  setConfirmDlg(null);
                }}
                className="px-4 py-2 rounded text-xs font-semibold bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
              >
                {lang === "vi" ? "Hủy bỏ" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  confirmDlg.resolve(true);
                  setConfirmDlg(null);
                }}
                className="px-4 py-2 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all"
              >
                {lang === "vi" ? "Đồng ý" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Relaunch Campaign Modal */}
      {relaunchConfigCamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#111318] border border-[#2B303C] rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-zoomIn">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-lg">
                  🤖
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {lang === "vi" ? "Cấu hình tái khởi tạo V2" : "Configure Relaunch V2"}
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                {lang === "vi" 
                  ? `Bạn đang tắt chiến dịch cũ và khởi tạo chiến dịch mới V2 tương tự cho: ` 
                  : `You are pausing the old campaign and relaunching a new V2 campaign for: `}
                <span className="text-white font-bold block mt-1 break-all bg-[#15181F] p-2.5 rounded border border-[#1E232F]">{relaunchConfigCamp.name}</span>
              </p>

              {isLoadingRelaunchInfo ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-xs text-indigo-400 font-mono">
                  <svg className="animate-spin h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{lang === "vi" ? "Đang tải thông số từ TikTok..." : "Loading config from TikTok..."}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 mt-2">
                  {/* Custom Budget Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                      {lang === "vi" ? "Ngân sách mới (VNĐ)" : "New Budget (VND)"}
                    </label>
                    <input
                      type="text"
                      required
                      value={relaunchBudget}
                      onChange={(e) => setRelaunchBudget(formatNumberString(e.target.value))}
                      className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors w-full font-mono font-bold"
                      placeholder="e.g. 200,000"
                    />
                  </div>

                  {/* Custom ROAS Bid Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                      {lang === "vi" ? "Target ROI (ROAS mục tiêu)" : "Target ROI (Target ROAS)"}
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      required
                      value={relaunchRoas}
                      onChange={(e) => setRelaunchRoas(e.target.value)}
                      className="bg-[#0E1015] text-gray-200 text-xs border border-[#2B303C] rounded px-3 py-2.5 outline-none focus:border-indigo-500 transition-colors w-full font-mono font-bold"
                      placeholder="e.g. 3.50"
                    />
                    <span className="text-[9px] text-gray-550 leading-normal block">
                      {lang === "vi" 
                        ? "⚠️ Giá trị này quyết định tốc độ tiêu tiền. ROI đặt càng thấp, TikTok sẽ cắn tiền càng mạnh và ngược lại." 
                        : "⚠️ This value controls the spend speed. A lower target ROI results in faster spend and vice versa."}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-[#151820] px-6 py-4 flex items-center justify-end gap-3 border-t border-[#1F232B]">
              <button
                onClick={() => setRelaunchConfigCamp(null)}
                className="px-4 py-2 rounded text-xs font-semibold bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
              >
                {lang === "vi" ? "Hủy bỏ" : "Cancel"}
              </button>
              <button
                onClick={submitRelaunchCampaign}
                disabled={isLoadingRelaunchInfo}
                className="px-4 py-2 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                <span>🚀</span>
                <span>{lang === "vi" ? "Khởi tạo V2" : "Relaunch V2"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Sync Recovery Modal */}
      {showHistoricalSyncModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0E1015] border border-[#1E232F] rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-5 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {lang === "vi" ? "Khôi phục dữ liệu lịch sử" : "Recover Historical Data"}
                  </h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {lang === "vi" ? "Đồng bộ lại dữ liệu từ TikTok API theo khoảng ngày" : "Re-sync data from TikTok API by date range"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowHistoricalSyncModal(false)} className="text-gray-500 hover:text-white transition-colors p-1 rounded">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Warning */}
            <div className="bg-amber-950/30 border border-amber-800/30 rounded-lg p-3 flex gap-2.5">
              <svg className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[10px] text-amber-300/80 leading-relaxed">
                {lang === "vi"
                  ? "TikTok API chỉ lưu dữ liệu trong vòng 30 ngày gần nhất. Quá trình khôi phục có thể mất vài phút tùy số ngày và số tài khoản."
                  : "TikTok API only retains data for the last 30 days. Recovery may take a few minutes depending on date range and account count."}
              </p>
            </div>

            {/* Date Range Inputs */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                  {lang === "vi" ? "Từ ngày" : "Start Date"}
                </label>
                <input
                  type="date"
                  disabled={historicalSyncing}
                  value={historicalSyncStart}
                  onChange={(e) => setHistoricalSyncStart(e.target.value)}
                  className="bg-[#0A0C10] text-gray-200 text-xs border border-[#2B303C] rounded-lg px-3 py-2.5 outline-none focus:border-amber-500 transition-colors w-full font-mono disabled:opacity-50"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                  {lang === "vi" ? "Đến ngày" : "End Date"}
                </label>
                <input
                  type="date"
                  disabled={historicalSyncing}
                  value={historicalSyncEnd}
                  onChange={(e) => setHistoricalSyncEnd(e.target.value)}
                  className="bg-[#0A0C10] text-gray-200 text-xs border border-[#2B303C] rounded-lg px-3 py-2.5 outline-none focus:border-amber-500 transition-colors w-full font-mono disabled:opacity-50"
                />
              </div>
            </div>

            {/* Real-Time Progress Bar when Syncing */}
            {historicalSyncing && (
              <div className="bg-[#15181F] border border-[#2B303C] rounded-xl p-4 flex flex-col gap-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "vi" ? `Đang đồng bộ: ${historicalProgress.currentDate}` : `Syncing date: ${historicalProgress.currentDate}`}
                  </span>
                  <span className="font-mono font-bold text-white text-xs">
                    {historicalProgress.percent}% ({historicalProgress.current}/{historicalProgress.total} {lang === "vi" ? "ngày" : "days"})
                  </span>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full bg-[#0E1015] h-2.5 rounded-full overflow-hidden border border-[#1E232F]">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${historicalProgress.percent}%` }}
                  />
                </div>

                <span className="text-[10px] text-gray-500 font-mono">
                  {lang === "vi" ? "Tốc độ trung bình: ~1.5 giây / 1 ngày dữ liệu" : "Average speed: ~1.5s per day"}
                </span>
              </div>
            )}

            {/* Live History Log Box */}
            {historicalProgress.logs.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                  {lang === "vi" ? `Nhật ký tiến độ (${historicalProgress.logs.length} ngày đã xong):` : `Progress Log (${historicalProgress.logs.length} days done):`}
                </span>
                <div className="max-h-36 overflow-y-auto bg-[#0A0C10] border border-[#1E232F] rounded-lg p-2 flex flex-col gap-1 font-mono text-[11px]">
                  {historicalProgress.logs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2 py-1 rounded bg-[#111318] border border-[#1B1F2A]">
                      <span className="text-gray-300 font-semibold">{log.date}</span>
                      {log.success ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                          ✓ {lang === "vi" ? `Thành công (${log.syncedAccounts || 0} tài khoản)` : `Done (${log.syncedAccounts || 0} accounts)`}
                        </span>
                      ) : (
                        <span className="text-red-400 text-[10px]">
                          ✕ {log.error || (lang === "vi" ? "Lỗi kết nối" : "Error")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Summary Result */}
            {!historicalSyncing && historicalSyncResult && (
              <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3">
                <p className="text-[11px] text-emerald-300 font-mono font-semibold">
                  ✅ {lang === "vi" ? "Đã hoàn tất khôi phục" : "Recovery completed"}: {historicalSyncResult.successDays}/{historicalSyncResult.totalDays} {lang === "vi" ? "ngày thành công" : "days synced successfully"}
                  {historicalSyncResult.failedDays > 0 && (
                    <span className="text-red-400 font-normal"> · {historicalSyncResult.failedDays} {lang === "vi" ? "ngày bị lỗi" : "days failed"}</span>
                  )}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 justify-end">
              {historicalSyncing ? (
                <button
                  type="button"
                  onClick={handleStopHistoricalSync}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-700/40 transition-all flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{lang === "vi" ? "Dừng lại" : "Stop"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHistoricalSyncModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
                >
                  {lang === "vi" ? "Đóng" : "Close"}
                </button>
              )}

              {!historicalSyncing && (
                <button
                  type="button"
                  onClick={handleHistoricalSync}
                  disabled={!historicalSyncStart || !historicalSyncEnd}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-amber-600/20 transition-all flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
                  </svg>
                  <span>{lang === "vi" ? "Bắt đầu khôi phục" : "Start Recovery"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
