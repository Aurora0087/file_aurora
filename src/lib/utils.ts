import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const groupItemsByDate = (items: any[]) => {
  const now = new Date()
  const startOfToday = new Date(now.setHours(0, 0, 0, 0)).getTime()
  const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000
  const startOfLastWeek = startOfToday - 14 * 24 * 60 * 60 * 1000
  const startOfLastMonth = startOfToday - 30 * 24 * 60 * 60 * 1000

  return {
    today: items.filter(i => i.lastOpened >= startOfToday),
    thisWeek: items.filter(i => i.lastOpened < startOfToday && i.lastOpened >= startOfWeek),
    lastWeek: items.filter(i => i.lastOpened < startOfWeek && i.lastOpened >= startOfLastWeek),
    lastMonth: items.filter(i => i.lastOpened < startOfLastWeek && i.lastOpened >= startOfLastMonth),
    older: items.filter(i => i.lastOpened < startOfLastMonth),
  }
}

export const truncateName = ({name,maxLength=18}:{name: string,maxLength?:number}): string => {
  return name.length > maxLength ? `${name.slice(0, Math.max(3,maxLength-3))}...` : name;
};