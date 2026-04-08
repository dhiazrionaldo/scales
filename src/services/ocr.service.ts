/**
 * OCR Service - Integration with Self-Hosted OCR Service
 * 
 * Handles communication with the Python FastAPI OCR service
 * deployed on self-hosted VM
 */

interface OCRConfig {
  baseUrl: string;
  n8nWebhookUrl: string;
  n8nLocationWebhookUrl: string;
  timeout: number;
  retryAttempts: number;
}

interface HULabelResponse {
  hu_label: string;
  product_name: string;
  qty: number;
  net_weight: number;
  batch: string;
  confidence: number;
  raw_text: string;
  processing_time_ms: number;
  product_sku: string;
}

interface DeliveryOrderResponse {
  hu_label: string;
  product_name: string;
  qty: number;
  batch: string;
  confidence: number;
  raw_text: string;
  processing_time_ms: number;
}

interface ImageQualityResponse {
  quality_score: number;
  quality_level: 'high' | 'medium' | 'low';
}

class OCRService {
  private config: OCRConfig;

  constructor(config?: Partial<OCRConfig>) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_AI_SERVICE_URL || '',
      n8nWebhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_AI_SERVICE_URL || '',
      n8nLocationWebhookUrl: process.env.NEXT_PUBLIC_N8N_LOCATION_WEBHOOK_URL || '',
      timeout: parseInt(process.env.OCR_TIMEOUT || '30000', 10),
      retryAttempts: parseInt(process.env.OCR_RETRY_ATTEMPTS || '3', 10),
      ...config,
    };
  }

  /**
   * Extract HU label from image file
   */
  async extractHULabelFromFile(
    companyId: string,
    warehouseId: string,
    file: File
  ): Promise<HULabelResponse> {
    // Validate required parameters
    if (!companyId || !companyId.trim()) {
      throw new Error('Company ID is required for OCR processing');
    }
    if (!warehouseId || !warehouseId.trim()) {
      throw new Error('Warehouse ID is required for OCR processing');
    }
    if (!file) {
      throw new Error('File is required for OCR processing');
    }

    const formData = new FormData();
    formData.append("company_id", companyId);
    formData.append("warehouse_id", warehouseId);
    formData.append("file", file);

    // Build n8n webhook URL and prepare headers
    const n8nWebhookUrl = `${this.config.n8nWebhookUrl}/webhook/upload-label`;
    const headers: Record<string, string> = {};
    if (process.env.N8N_API_KEY) {
      headers['X-N8N-API-KEY'] = process.env.N8N_API_KEY;
    }
    

    const response = await this.retryRequest(
      () => this.postToN8N<any>(n8nWebhookUrl, formData, headers),
      "Extract HU Label"
    );

    // Map n8n response → existing structure
    return {
      hu_label: response.hu_label || null,
      product_name: response.product_name || null,
      qty: response.qty ? Number(response.qty) : 0,
      net_weight: response.net_weight || null,
      batch: response.batch || null,
      confidence: response.confidence || 0.9,
      raw_text: response.raw_text || "",
      processing_time_ms: response.processing_time_ms || 0,
      product_sku: response.product_sku || null
    };
  }

  /**
   * Extract HU label from base64 encoded image
   */
  async extractHULabelFromBase64(
    companyId: string,
    warehouseId: string,
    imageData: string
  ): Promise<HULabelResponse> {
    return this.retryRequest(
      () =>
        this.get('/api/v1/ocr/hu-label/base64', {
          company_id: companyId,
          warehouse_id: warehouseId,
          image_data: imageData,
        }),
      'Extract HU Label from Base64'
    );
  }

  /**
   * Extract HU label from image URL
   */
  async extractHULabelFromUrl(
    companyId: string,
    warehouseId: string,
    imageUrl: string
  ): Promise<HULabelResponse> {
    return this.retryRequest(
      () =>
        this.get('/api/v1/ocr/hu-label/url', {
          company_id: companyId,
          warehouse_id: warehouseId,
          image_url: imageUrl,
        }),
      'Extract HU Label from URL'
    );
  }

  /**
   * Extract delivery order from image file
   */
  async extractDeliveryOrderFromFile(
    companyId: string,
    warehouseId: string,
    file: File
  ): Promise<DeliveryOrderResponse> {
    const formData = new FormData();
    formData.append('company_id', companyId);
    formData.append('warehouse_id', warehouseId);
    formData.append('file', file);

    return this.retryRequest(
      () => this.post('/api/v1/ocr/delivery-order', formData, false),
      'Extract Delivery Order'
    );
  }

  /**
   * Extract delivery order from base64 encoded image
   */
  async extractDeliveryOrderFromBase64(
    companyId: string,
    warehouseId: string,
    imageData: string
  ): Promise<DeliveryOrderResponse> {
    return this.retryRequest(
      () =>
        this.get('/api/v1/ocr/delivery-order/base64', {
          company_id: companyId,
          warehouse_id: warehouseId,
          image_data: imageData,
        }),
      'Extract Delivery Order from Base64'
    );
  }

  /**
   * Get image quality score
   */
  async getImageQuality(file: File): Promise<ImageQualityResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.retryRequest(
      () => this.post('/api/v1/image/quality-score', formData, false),
      'Get Image Quality'
    );
  }

  /**
   * Check OCR service health
   */
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    try {
      return await this.get('/health', {});
    } catch (error) {
      throw new Error('OCR service is unavailable');
    }
  }

  /**
   * Suggest warehouse locations based on HU label data
   */
  async suggestLocations(
    warehouseId: string,
    companyId: string,
    huLabel: string | null,
    productName: string | null,
    qty: number,
    batch: string | null
  ): Promise<Array<{ location_id: string; location_code: string; capacity_available: number; distance_score: number }>> {
    // Validate required parameters
    if (!warehouseId || !warehouseId.trim()) {
      throw new Error('Warehouse ID is required for location suggestions');
    }
    if (!companyId || !companyId.trim()) {
      throw new Error('Company ID is required for location suggestions');
    }
    if (!this.config.n8nLocationWebhookUrl) {
      throw new Error('n8n location webhook URL not configured');
    }

    const body = {
      warehouse_id: warehouseId,
      company_id: companyId,
      hu_label: huLabel,
      product_name: productName,
      qty,
      batch,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.N8N_API_KEY) {
      headers['X-N8N-API-KEY'] = process.env.N8N_API_KEY;
    }

    return this.retryRequest(
      () => this.postJsonToN8N<any>(this.config.n8nLocationWebhookUrl, body, headers),
      'Suggest Warehouse Locations'
    );
  }

  /**
   * Private methods
   */

  private async postToN8N<T>(
    url: string,
    body: FormData,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(this.config.timeout),
    };

    const response = await fetch(url, fetchOptions);

    return this.handleResponse<T>(response);
  }

  private async postJsonToN8N<T>(
    url: string,
    body: object,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout),
    };

    const response = await fetch(url, fetchOptions);
    return this.handleResponse<T>(response);
  }

  private async get<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.config.timeout),
    });

    return this.handleResponse<T>(response);
  }

  private async post<T>(
    endpoint: string,
    body: FormData | object,
    isJson: boolean = true,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const fetchOptions: RequestInit = {
      method: 'POST',
      signal: AbortSignal.timeout(this.config.timeout),
    };

    if (isJson) {
      fetchOptions.headers = {
        'Content-Type': 'application/json',
        ...headers,
      };
      fetchOptions.body = JSON.stringify(body);
    } else {
      fetchOptions.headers = headers;
      fetchOptions.body = body as FormData;
    }

    const response = await fetch(url, fetchOptions);
    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Unknown error',
      }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retryAttempts - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const delay = Math.pow(2, attempt) * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`
    );
  }
}

// Singleton instance
const ocrService = new OCRService();

export default ocrService;
export type { HULabelResponse, DeliveryOrderResponse, ImageQualityResponse };
