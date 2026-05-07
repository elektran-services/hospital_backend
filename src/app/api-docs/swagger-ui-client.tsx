"use client";

import { useCallback, useEffect } from "react";
import Script from "next/script";

type SwaggerRequest = {
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
};

type SwaggerUIBundleType = ((config: {
  url: string;
  dom_id: string;
  presets: unknown[];
  persistAuthorization: boolean;
  requestInterceptor: (req: SwaggerRequest) => SwaggerRequest;
}) => unknown) & {
  presets: {
    apis: unknown;
  };
};

type SwaggerWindow = Window & {
  SwaggerUIBundle?: SwaggerUIBundleType;
  ui?: unknown;
};

const LIGHT_STYLES = `
  :root, body, #swagger-ui {
    color-scheme: light !important;
  }
  body {
    background: #f8fafc !important;
    color: #0f172a !important;
  }
  #swagger-ui {
    background: #ffffff !important;
    color: #0f172a !important;
  }
  .swagger-ui .topbar {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
  }
  .swagger-ui .topbar a {
    color: #0f172a;
  }
  .swagger-ui .information-container,
  .swagger-ui .scheme-container,
  .swagger-ui .models {
    background: #ffffff;
    border-color: #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }
  .swagger-ui .opblock {
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }
  .swagger-ui .opblock-summary {
    background: #f8fafc;
    border-color: #e2e8f0;
    border-radius: 8px;
  }
  .swagger-ui .opblock-summary-method {
    border-right-color: #e2e8f0;
  }
  .swagger-ui .response-col_status {
    color: #0f172a;
  }
  .swagger-ui .opblock-description-wrapper,
  .swagger-ui .opblock-section-header {
    background: #ffffff;
  }
  .swagger-ui select {
    background: #ffffff;
    color: #0f172a;
  }
`;

const specUrl = "/api/v1/openapi";

export default function SwaggerUIClient() {
  const initSwagger = useCallback(() => {
    const getCookie = (name: string) => {
      if (typeof document === "undefined") return undefined;
      const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : undefined;
    };

    if (typeof window === "undefined") return;
    const swaggerWindow = window as SwaggerWindow;
    const SwaggerUIBundle = swaggerWindow.SwaggerUIBundle;
    if (!SwaggerUIBundle) return;
    swaggerWindow.ui = SwaggerUIBundle({
      url: specUrl,
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis],
      persistAuthorization: true,
      requestInterceptor: (req: SwaggerRequest) => {
        const request = req ?? {};
        request.credentials = "include";
        const headers = request.headers ?? {};
        if (!headers.Authorization) {
          const cookieToken = getCookie("access_token");
          if (cookieToken) {
            headers.Authorization = `Bearer ${cookieToken}`;
          }
        }
        request.headers = headers;
        return request;
      },
    });
  }, []);

  useEffect(() => {
    // Retry shortly after mount in case scripts load late.
    const id = setTimeout(initSwagger, 100);
    return () => clearTimeout(id);
  }, [initSwagger]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "24px 12px",
      }}
    >
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      />
      <style dangerouslySetInnerHTML={{ __html: LIGHT_STYLES }} />
      <div
        id="swagger-ui"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          background: "#ffffff",
          padding: "16px",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={initSwagger}
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
        onLoad={initSwagger}
      />
    </div>
  );
}

