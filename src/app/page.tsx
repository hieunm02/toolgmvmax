"use client";

import React, { useState, useEffect } from "react";

// Format number to VND currency
const formatVND = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + '₫';
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
  lang: "vi" | "en"
): SpeedResult => {
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
    title: "GMV Max OS",
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
    title: "GMV Max OS",
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
  const [activeTab, setActiveTab] = useState<"campaigns" | "products" | "creatives" | "alerts" | "ai" | "settings">("campaigns");
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [tempRoiThreshold, setTempRoiThreshold] = useState("3.0");
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>("");
  const [dbAdvertisers, setDbAdvertisers] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [sendingReport, setSendingReport] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<string>("spend"); // Default sorting column
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // Default sorting order (low to high as requested)
  const [gmvMaxTypeFilter, setGmvMaxTypeFilter] = useState<"ALL" | "PRODUCT" | "LIVE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const [selectedReportDate, setSelectedReportDate] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [campaignPage, setCampaignPage] = useState<number>(1);
  const CAMPAIGNS_PER_PAGE = 10;

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
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        showToast(lang === "vi" ? `Đã sao chép ${label}: ${textToCopy}` : `Copied ${label}: ${textToCopy}`, "success");
      })
      .catch((err) => {
        showToast(lang === "vi" ? "Lỗi khi sao chép!" : "Copy failed!", "error");
        console.error("Clipboard copy error:", err);
      });
  };

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
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
  const [widgets, setWidgets] = useState({
    totalSpend: 0,
    totalGMV: 0,
    totalOrders: 0,
    averageROI: 0,
    averageCTR: 0,
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [productsData, setProductsData] = useState<any>({ products: [], topProducts: [], worstProducts: [] });
  const [creativesData, setCreativesData] = useState<any>({ creatives: [], topCreatives: [], worstCreatives: [] });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [relaunchingId, setRelaunchingId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

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
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState("");
  const [editingShopRoi, setEditingShopRoi] = useState("3.0");

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
          autoRelaunchRoiThreshold: parseFloat(newShopRoi)
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewShopName("");
        setNewShopTiktokId("");
        setNewShopRoi("3.0");
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

  const handleRenameShop = async (shopId: string) => {
    if (!editingShopName.trim()) return;
    try {
      const res = await fetch("/api/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: shopId,
          name: editingShopName,
          autoRelaunchRoiThreshold: parseFloat(editingShopRoi)
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingShopId(null);
        setEditingShopName("");
        setEditingShopRoi("3.0");
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
    };
  }, [widgets, selectedAdvertiser, gmvMaxTypeFilter, statusFilter, filteredCampaigns]);

  // Filter and sort creatives
  const filteredCreatives = React.useMemo(() => {
    let list = creativesData.creatives || [];

    // Filter by selected advertiser if set
    if (selectedAdvertiser) {
      list = list.filter((c: any) => c.advertiserName === selectedAdvertiser);
    }

    // Filter by search query (name or videoId)
    if (creativeSearchQuery.trim()) {
      const q = creativeSearchQuery.toLowerCase();
      list = list.filter((c: any) => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.videoId && c.videoId.toLowerCase().includes(q))
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
      }
    } catch (e) {
      console.error("Failed to load shops list", e);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // Synchronize tempRoiThreshold when selected shop or shops list updates
  useEffect(() => {
    if (selectedShop) {
      const currentShop = shops.find((s) => s.id === selectedShop);
      if (currentShop) {
        setTempRoiThreshold(currentShop.autoRelaunchRoiThreshold.toString());
      }
    } else {
      setTempRoiThreshold("3.0");
    }
  }, [selectedShop, shops]);

  const handleSaveRoiThreshold = async () => {
    if (!selectedShop) return;
    const thresholdValue = parseFloat(tempRoiThreshold);
    if (isNaN(thresholdValue) || thresholdValue <= 0) {
      showToast(lang === "vi" ? "Mức ROI không hợp lệ!" : "Invalid ROI threshold!", "error");
      return;
    }

    try {
      const res = await fetch("/api/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedShop,
          autoRelaunchRoiThreshold: thresholdValue,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          lang === "vi"
            ? `Đã cập nhật mức ROI tự động lên camp thành < ${thresholdValue.toFixed(1)}!`
            : `Updated auto-relaunch ROI threshold to < ${thresholdValue.toFixed(1)}!`,
          "success"
        );
        fetchShops();
      } else {
        showToast(json.error || "Failed to update ROI threshold", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating ROI threshold", "error");
    }
  };

  // Fetch Dashboard Metrics
  const fetchData = async (reportDate?: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Build shared params with optional date filter
      const baseParams = new URLSearchParams();
      if (selectedShop) baseParams.set("shopId", selectedShop);
      if (reportDate) {
        baseParams.set("startDate", reportDate);
        baseParams.set("endDate", reportDate);
      }
      const dateParam = baseParams.toString() ? `?${baseParams.toString()}` : "";

      // Shop-only param for APIs that don't need date filtering
      const shopOnlyParams = new URLSearchParams();
      if (selectedShop) shopOnlyParams.set("shopId", selectedShop);
      const shopParam = shopOnlyParams.toString() ? `?${shopOnlyParams.toString()}` : "";

      const [dashRes, campRes, prodRes, creatRes, alertRes, aiRes] = await Promise.all([
        fetch(`/api/dashboard${dateParam}`),
        fetch(`/api/campaigns${dateParam}`),
        fetch(`/api/products${shopParam}`),
        fetch(`/api/creatives${shopParam}`),
        fetch(`/api/alerts`),
        fetch(`/api/ai${shopParam}`),
      ]);

      const [dash, camp, prod, creat, alert, ai] = await Promise.all([
        dashRes.json(),
        campRes.json(),
        prodRes.json(),
        creatRes.json(),
        alertRes.json(),
        aiRes.json(),
      ]);

      if (dash.success) setWidgets(dash.data.widgets);
      if (camp.success) setCampaigns(camp.data);
      if (prod.success) setProductsData(prod.data);
      if (creat.success) setCreativesData(creat.data);
      if (alert.success) setAlerts(alert.data);
      if (ai.success) setRecommendations(ai.data);
    } catch (e) {
      console.error("Failed to load dashboard metrics", e);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch dashboard + campaigns when report date changes
  const fetchDataForDate = async (reportDate: string) => {
    try {
      const baseParams = new URLSearchParams();
      if (selectedShop) baseParams.set("shopId", selectedShop);
      if (reportDate) {
        baseParams.set("startDate", reportDate);
        baseParams.set("endDate", reportDate);
      }
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
      console.error("Failed to load data for date", e);
    }
  };

  const handleReportDateChange = (date: string) => {
    setSelectedReportDate(date);
    fetchDataForDate(date);
  };

  useEffect(() => {
    setSelectedAdvertiser("");
    fetchAdvertisers();
    fetchData(selectedReportDate);
  }, [selectedShop]);

  // Tự động làm mới dữ liệu ngầm cứ mỗi 30 giây để cập nhật dữ liệu đồng bộ mới nhất
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(selectedReportDate, true);
    }, 30000); // 30 giây
    return () => clearInterval(interval);
  }, [selectedShop, selectedReportDate]);

  // Sync handler
  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const res = await response.json();
      if (res.success) {
        showToast(lang === "vi" ? `Đồng bộ thành công! Số tài khoản cập nhật: ${res.data.syncedAccounts}` : `Sync successfully completed! Synced accounts: ${res.data.syncedAccounts}`, "success");
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

  // Campaign relaunch handler
  const handleRelaunchCampaign = async (campaignId: string, alertId?: string) => {
    const isConfirmed = await askConfirm(
      lang === "vi"
        ? "Bạn có chắc chắn muốn dừng chiến dịch cũ và khởi tạo chiến dịch mới V2 tương tự?"
        : "Are you sure you want to pause the old campaign and relaunch a new V2 campaign?"
    );
    if (!isConfirmed) {
      return;
    }

    setRelaunchingId(campaignId);
    try {
      const response = await fetch("/api/campaigns/relaunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, alertId }),
      });
      const res = await response.json();
      if (res.success) {
        showToast(lang === "vi" ? `Tái khởi tạo thành công! Chiến dịch mới ID: ${res.data.newCampaignId}` : `Relaunch successful! New Campaign ID: ${res.data.newCampaignId}`, "success");
        // Fetch fresh dashboard data to update tables and alerts list
        fetchData();
      } else {
        showToast(lang === "vi" ? `Lỗi tái khởi tạo: ${res.error}` : `Relaunch failed: ${res.error}`, "error");
      }
    } catch (err: any) {
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
        <div className="flex items-center justify-between gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-black text-black text-sm tracking-wider flex-shrink-0">
              GMV
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-wide text-white">{t.title}</h1>
              <p className="text-[10px] sm:text-xs text-gray-500 font-mono hidden sm:block">{t.subtitle}</p>
            </div>
          </div>

          {/* Quick controls on the right (Language + Theme) on mobile, hidden on desktop */}
          <div className="flex items-center gap-2 md:hidden">
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
          </div>
        </div>

        {/* Action Controls: Dropdown and buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Ad Account Switcher */}
          {dbAdvertisers.length > 0 && (
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedAdvertiser}
                onChange={(e) => setSelectedAdvertiser(e.target.value)}
                className="bg-[#15181F] text-gray-300 text-xs border border-[#2B303C] rounded px-3 py-2 cursor-pointer outline-none hover:border-indigo-500 transition-colors w-full sm:w-auto"
              >
                <option value="">{lang === "vi" ? "Tất cả tài khoản quảng cáo" : "All Ad Accounts"}</option>
                {dbAdvertisers.map((adv) => (
                  <option key={adv.id} value={adv.name}>
                    {adv.name} ({adv.advertiserId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sync & Telegram buttons row */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold tracking-wide transition-all ${
                syncing
                  ? "bg-indigo-950 text-indigo-400 cursor-not-allowed border border-indigo-800/30"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
              }`}
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-indigo-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t.syncing}
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
                  </svg>
                  <span className="truncate">{t.syncAccounts}</span>
                </>
              )}
            </button>

            {/* Telegram Report Button */}
            <button
              onClick={handleSendTelegramReport}
              disabled={sendingReport}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold tracking-wide transition-all ${
                sendingReport
                  ? "bg-[#0b283d] text-sky-400 cursor-not-allowed border border-sky-950"
                  : "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20"
              }`}
            >
              {sendingReport ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-sky-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{lang === "vi" ? "Đang gửi..." : "Sending..."}</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.7-2.48 2.75-2.7.01-.03.01-.15-.07-.22-.08-.07-.2-.05-.29-.03-.12.03-2.04 1.29-5.74 3.79-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.08-.49-.83-.27-1.49-.41-1.43-.87.03-.24.36-.49.98-.74 3.84-1.67 6.4-2.77 7.68-3.3 3.65-1.52 4.41-1.78 4.9-.18l.05.09c.07.13.14.3.16.48.02.13.01.27-.01.4z"/>
                  </svg>
                  <span className="truncate">{lang === "vi" ? "Báo cáo" : "Report"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Language & Theme Switcher on Desktop (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-3">
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
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-6">

        {/* Shop Switcher Buttons */}
        <section className="flex flex-col gap-2.5 bg-[#111318]/50 border border-[#1F232B]/85 rounded-xl p-4.5 backdrop-blur-md relative overflow-hidden">
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
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                selectedShop === ""
                  ? "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white border-indigo-400/50 shadow-lg shadow-indigo-600/20 transform scale-[1.02]"
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
                className={`flex items-center gap-2 px-4.5 py-2.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                  selectedShop === shop.id
                    ? "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white border-indigo-400/50 shadow-lg shadow-indigo-600/20 transform scale-[1.02]"
                    : "bg-[#151820]/90 hover:bg-[#1E222D] text-gray-400 hover:text-gray-200 border-[#222733] hover:border-indigo-500/30"
                }`}
              >
                <span className="text-sm">🛍️</span>
                <span>{shop.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Global Date Picker */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-[#111318] border border-[#1F232B] rounded-lg px-5 py-3">
            <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-gray-300 font-medium">
              {lang === "vi" ? "Xem dữ liệu theo ngày:" : "View data for date:"}
            </span>
            <input
              type="date"
              value={selectedReportDate}
              onChange={(e) => handleReportDateChange(e.target.value)}
              className="bg-[#1A1D26] text-gray-200 text-xs font-mono outline-none border border-[#2B303C] rounded-md px-3 py-1.5 cursor-pointer [color-scheme:dark] hover:border-indigo-500/50 focus:border-indigo-500 transition-colors"
            />
            {selectedReportDate ? (
              <>
                <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  {lang === "vi" ? `Đang xem: ${new Date(selectedReportDate + "T00:00:00").toLocaleDateString("vi-VN")}` : `Viewing: ${new Date(selectedReportDate + "T00:00:00").toLocaleDateString("en-US")}`}
                </span>
                <button
                  onClick={() => handleReportDateChange("")}
                  className="text-gray-500 hover:text-rose-400 transition-colors text-xs font-bold px-2 py-1 rounded hover:bg-rose-500/10"
                  title={lang === "vi" ? "Xóa bộ lọc ngày — xem tất cả" : "Clear date filter — view all"}
                >
                  ✕
                </button>
              </>
            ) : (
              <span className="text-[10px] text-gray-500 font-mono">
                {lang === "vi" ? "Tất cả ngày" : "All dates"}
              </span>
            )}
          </div>

          {selectedShop && (
            <div className="flex items-center gap-3 bg-[#111318] border border-[#1F232B] rounded-lg px-5 py-3">
              <span className="text-xs text-gray-300 font-medium">
                {lang === "vi" ? "🤖 Tự động lên camp khi ROI <" : "🤖 Auto-relaunch when ROI <"}
              </span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={tempRoiThreshold}
                onChange={(e) => setTempRoiThreshold(e.target.value)}
                className="w-14 bg-[#1A1D26] text-gray-200 text-xs text-center font-mono outline-none border border-[#2B303C] rounded px-1.5 py-1 focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={handleSaveRoiThreshold}
                className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-md shadow-indigo-600/15"
              >
                {lang === "vi" ? "Lưu" : "Save"}
              </button>
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

        {/* Tab Controls */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#1F232B] pb-px">
          <div className="flex gap-1 overflow-x-auto max-w-full no-scrollbar whitespace-nowrap">
            {[
              { id: "campaigns", label: t.tabCampaigns },
              { id: "products", label: t.tabProducts },
              { id: "creatives", label: t.tabCreatives },
              { id: "alerts", label: `${t.tabAlerts} (${alerts.filter(a => a.status === "UNRESOLVED").length})` },
              { id: "ai", label: t.tabAi },
              { id: "settings", label: t.tabSettings },
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
            {lang === "vi" ? "Đồng bộ tự động: 5 phút / lần" : t.lastUpdate}
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
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  camp.status === "CAMPAIGN_STATUS_ENABLE"
                                    ? "bg-emerald-950 text-emerald-400"
                                    : "bg-gray-850 text-gray-400"
                                }`}>
                                  {camp.status === "CAMPAIGN_STATUS_ENABLE" ? t.active : t.paused}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-mono">{formatVND(camp.spend)}</td>
                              <td className="px-6 py-4 text-right font-mono text-white">{formatVND(camp.gmv)}</td>
                              <td className="px-6 py-4 text-right font-mono font-semibold">
                                <div className="flex flex-col items-end gap-1">
                                  <span className={camp.roi >= 3.5 ? "text-emerald-400" : "text-rose-400"}>
                                    {camp.roi.toFixed(2)}x
                                  </span>
                                  {camp.status === "CAMPAIGN_STATUS_ENABLE" && camp.spend >= 200000 && camp.roi < 3.0 && camp.orders < 20 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRelaunchCampaign(camp.campaignId);
                                      }}
                                      disabled={relaunchingId === camp.campaignId}
                                      className="text-[9px] font-sans font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-900/50 disabled:opacity-50 transition-colors"
                                    >
                                      {relaunchingId === camp.campaignId ? (lang === "vi" ? "Đang lên..." : "Relaunching...") : (lang === "vi" ? "Tái khởi tạo" : "Relaunch")}
                                    </button>
                                  )}
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
                                          lang
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
                                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded font-sans scale-[0.85] ${ratingColor}`}>
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
                                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded font-sans scale-[0.85] ${ratingColor}`}>
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

            {/* Tab 5: AI Recommendations */}
            {activeTab === "ai" && (
              <div className="bg-[#111318] border border-[#1F232B] rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1F232B]">
                  <h3 className="text-sm font-semibold text-white">{t.aiEngine}</h3>
                </div>
                <div className="divide-y divide-[#1F232B]">
                  {recommendations.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500 font-mono">
                      {t.noRecs}
                    </div>
                  ) : (
                    recommendations.map((rec) => (
                      <div key={rec.id} className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6 hover:bg-[#151820]/45 transition-colors">
                        <div className="flex gap-4">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                            rec.action === "SCALE_BUDGET"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/30"
                              : rec.action === "REDUCE_BUDGET"
                              ? "bg-rose-950 text-rose-400 border border-rose-800/30"
                              : "bg-[#1E293B] text-cyan-400 border border-[#2B303C]"
                          }`}>
                            {rec.action === "SCALE_BUDGET" ? "📈" : rec.action === "REDUCE_BUDGET" ? "📉" : "⚡"}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-white text-xs">{rec.campaignName}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black ${
                                rec.priority === "HIGH"
                                  ? "bg-red-950 text-red-400"
                                  : rec.priority === "MEDIUM"
                                  ? "bg-amber-950 text-amber-400"
                                  : "bg-gray-850 text-gray-500"
                              }`}>
                                {rec.priority} {t.priority}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 block font-mono mt-1">{t.action}: {rec.action} ({rec.reason})</span>
                            <p className="text-xs text-gray-300 mt-2">{rec.details}</p>
                          </div>
                        </div>
                        <button className="px-3.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] tracking-wider uppercase flex-shrink-0 transition-colors">
                          {t.applyRec}
                        </button>
                      </div>
                    ))
                  )}
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
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingShopName}
                                        onChange={(e) => setEditingShopName(e.target.value)}
                                        className="bg-[#15181F] text-gray-200 text-xs border border-[#2B303C] rounded px-2.5 py-1 w-full outline-none focus:border-indigo-500"
                                        placeholder={lang === "vi" ? "Tên cửa hàng" : "Shop Name"}
                                        autoFocus
                                      />
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] text-gray-400 font-mono">ROI:</span>
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0.1"
                                          max="10"
                                          value={editingShopRoi}
                                          onChange={(e) => setEditingShopRoi(e.target.value)}
                                          className="bg-[#15181F] text-gray-200 text-xs border border-[#2B303C] rounded px-2 py-1 w-16 outline-none focus:border-indigo-500 text-center font-mono"
                                        />
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
                                    <div className="flex items-center gap-3 mt-0.5">
                                      <span className="text-[10px] text-gray-500 font-mono">ID: {shop.tiktokShopId}</span>
                                      <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.25 rounded">
                                        {lang === "vi" ? `ROI tự động lên camp: < ${shop.autoRelaunchRoiThreshold.toFixed(1)}` : `Auto-relaunch ROI: < ${shop.autoRelaunchRoiThreshold.toFixed(1)}`}
                                      </span>
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

                {/* 2. Ad Account Linking Panel */}
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
                              className={`w-11 h-5.5 rounded-full p-0.5 transition-all duration-300 flex items-center ${
                                adv.status === "ACTIVE"
                                  ? "bg-indigo-600 justify-end"
                                  : "bg-[#252833] justify-start border border-[#3E4357]/20"
                              }`}
                            >
                              <span className="w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all" />
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
    </div>
  );
}
