import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStaffColor = (staffId: string) => {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6',
    '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'
  ];
  try {
    const idx = Number(BigInt('0x' + staffId.replace(/-/g, '')) % BigInt(colors.length));
    return colors[idx];
  } catch (e) {
    let hash = 0;
    for (let i = 0; i < staffId.length; i++) {
      hash = staffId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
};
