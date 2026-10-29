export function errorMessage(err) {
  const data = err?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value.length > 0) return String(value[0]);
      if (typeof value === "string") return value;
    }
  }
  return err?.message || "Có lỗi xảy ra, vui lòng thử lại.";
}
