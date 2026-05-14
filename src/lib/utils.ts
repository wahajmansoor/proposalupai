import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = ['wahajmansoorcom@gmail.com', 'wahajmansoor@gmail.com', 'proadmin@proposalupai.com'];
  return admins.includes(email.toLowerCase());
}
