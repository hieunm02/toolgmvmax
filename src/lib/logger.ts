type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${ctxString}`;
  }

  info(message: string, context?: any) {
    console.log(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: any) {
    console.warn(this.formatMessage("warn", message, context));
  }

  error(message: string, error?: any, context?: any) {
    const combinedContext = {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack,
    };
    console.error(this.formatMessage("error", message, combinedContext));
  }

  debug(message: string, context?: any) {
    if (process.env.NODE_ENV !== "production") {
      console.log(this.formatMessage("debug", message, context));
    }
  }
}

export const logger = new Logger();
