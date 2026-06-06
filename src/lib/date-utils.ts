export function getVietnamDateString(date = new Date()): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function getVietnamDate(date = new Date()): Date {
  return new Date(getVietnamDateString(date));
}

export function getVietnamYesterdayDate(date = new Date()): Date {
  const vnDate = getVietnamDate(date);
  vnDate.setDate(vnDate.getDate() - 1);
  return vnDate;
}
