export class Logger {
  static info(message: string, data?: any) {
    console.log(`ℹ️ [${new Date().toISOString()}] ${message}`, data || "");
  }

  static error(message: string, error?: any) {
    console.error(`❌ [${new Date().toISOString()}] ${message}`, error || "");
  }

  static warn(message: string, data?: any) {
    console.warn(`⚠️ [${new Date().toISOString()}] ${message}`, data || "");
  }

  static success(message: string, data?: any) {
    console.log(`✅ [${new Date().toISOString()}] ${message}`, data || "");
  }
}
