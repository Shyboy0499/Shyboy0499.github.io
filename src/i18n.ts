// 站点语言边界：中文页 `/` 与英文页 `/en/` 是两份静态页面，切换语言即跳转页面。
// Runtime 与 World 模块只在浏览器中通过 <html lang> 读取语言；构建期页面必须显式传入 lang。
export type Lang = "zh" | "en";

export const LANG_STORAGE_KEY = "site-lang";

export const LANG_HOME_PATH: Record<Lang, string> = {
  zh: "/",
  en: "/en/",
};

// 构建期（无 document）固定回落到中文，避免 SSR 意外读到浏览器状态。
export function pageLang(): Lang {
  if (typeof document === "undefined") return "zh";
  return document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "zh";
}

export function t(zh: string, en: string, lang: Lang = pageLang()): string {
  return lang === "en" ? en : zh;
}
