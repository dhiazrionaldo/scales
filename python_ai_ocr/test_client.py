"""
Test client examples for SCALES AI OCR Service

Run this file to test the different endpoints:
    python test_client.py
"""

import requests
import base64
import json
import time
from pathlib import Path


class ScalesOCRClient:
    """Client for SCALES AI OCR Service"""
    
    def __init__(self, base_url: str = "http://10.100.17.2:8100"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def health_check(self) -> dict:
        """Check service health"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
    
    def get_status(self) -> dict:
        """Get detailed service status"""
        response = self.session.get(f"{self.base_url}/status")
        response.raise_for_status()
        return response.json()
    
    def extract_hu_label_file(
        self, 
        company_id: str, 
        warehouse_id: str, 
        image_path: str
    ) -> dict:
        """Extract HU label from image file"""
        with open(image_path, 'rb') as f:
            files = {'file': f}
            data = {
                'company_id': company_id,
                'warehouse_id': warehouse_id
            }
            response = self.session.post(
                f"{self.base_url}/api/v1/ocr/hu-label",
                files=files,
                data=data
            )
        response.raise_for_status()
        return response.json()
    
    def extract_hu_label_base64(
        self, 
        company_id: str, 
        warehouse_id: str, 
        image_path: str
    ) -> dict:
        """Extract HU label from base64 encoded image"""
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode()
        
        params = {
            'company_id': company_id,
            'warehouse_id': warehouse_id,
            'image_data': image_data
        }
        response = self.session.post(
            f"{self.base_url}/api/v1/ocr/hu-label/base64",
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def extract_hu_label_url(
        self, 
        company_id: str, 
        warehouse_id: str, 
        image_url: str
    ) -> dict:
        """Extract HU label from URL"""
        params = {
            'company_id': company_id,
            'warehouse_id': warehouse_id,
            'image_url': image_url
        }
        response = self.session.post(
            f"{self.base_url}/api/v1/ocr/hu-label/url",
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def extract_delivery_order_file(
        self, 
        company_id: str, 
        warehouse_id: str, 
        image_path: str
    ) -> dict:
        """Extract delivery order from image file"""
        with open(image_path, 'rb') as f:
            files = {'file': f}
            data = {
                'company_id': company_id,
                'warehouse_id': warehouse_id
            }
            response = self.session.post(
                f"{self.base_url}/api/v1/ocr/delivery-order",
                files=files,
                data=data
            )
        response.raise_for_status()
        return response.json()
    
    def get_image_quality(self, image_path: str) -> dict:
        """Get image quality score"""
        with open(image_path, 'rb') as f:
            files = {'file': f}
            response = self.session.post(
                f"{self.base_url}/api/v1/image/quality-score",
                files=files
            )
        response.raise_for_status()
        return response.json()


def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Check ===")
    client = ScalesOCRClient()
    try:
        result = client.health_check()
        print(json.dumps(result, indent=2))
        print("✓ Health check passed")
    except Exception as e:
        print(f"✗ Health check failed: {e}")


def test_status():
    """Test status endpoint"""
    print("\n=== Testing Service Status ===")
    client = ScalesOCRClient()
    try:
        result = client.get_status()
        print(json.dumps(result, indent=2))
        print("✓ Status check passed")
    except Exception as e:
        print(f"✗ Status check failed: {e}")


def test_hu_label_extraction():
    """Test HU label extraction"""
    print("\n=== Testing HU Label Extraction ===")
    
    # Sample company and warehouse UUIDs
    company_id = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE5MTUxMTYsImV4cCI6MTkyOTU5NTExNn0.0V7oHtg6-JX5u-Wyzk54LirL42DjaD8rcWf65NKniMc"
    warehouse_id = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE5MTUxMTYsImV4cCI6MTkyOTU5NTExNn0.0V7oHtg6-JX5u-Wyzk54LirL42DjaD8rcWf65NKniMc"
    
    client = ScalesOCRClient()
    
    # You would need an actual image file for testing
    sample_image = "sample_hu_label.jpg"
    
    if not Path(sample_image).exists():
        print(f"⚠ Sample image not found: {sample_image}")
        print("  Create a test image with HU label text and try again")
        return
    
    try:
        print(f"\nTesting file upload...")
        result = client.extract_hu_label_file(company_id, warehouse_id, sample_image)
        print(json.dumps(result, indent=2))
        print("✓ HU label extraction passed")
        
        # Print parsed fields
        print("\nExtracted Fields:")
        print(f"  HU Label: {result.get('hu_label')}")
        print(f"  Product: {result.get('product_name')}")
        print(f"  Quantity: {result.get('qty')}")
        print(f"  Weight: {result.get('net_weight')}")
        print(f"  Batch: {result.get('batch')}")
        print(f"  Confidence: {result.get('confidence'):.2%}")
        print(f"  Processing Time: {result.get('processing_time_ms'):.1f}ms")
    
    except Exception as e:
        print(f"✗ HU label extraction failed: {e}")


def test_performance():
    """Test service performance"""
    print("\n=== Testing Performance ===")
    
    company_id = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE5MTUxMTYsImV4cCI6MTkyOTU5NTExNn0.0V7oHtg6-JX5u-Wyzk54LirL42DjaD8rcWf65NKniMc"
    warehouse_id = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE5MTUxMTYsImV4cCI6MTkyOTU5NTExNn0.0V7oHtg6-JX5u-Wyzk54LirL42DjaD8rcWf65NKniMc"
    sample_image = "sample_hu_label.jpg"
    
    if not Path(sample_image).exists():
        print(f"⚠ Sample image not found: {sample_image}")
        return
    
    client = ScalesOCRClient()
    num_requests = 5
    times = []
    
    try:
        print(f"\nRunning {num_requests} OCR requests...")
        
        for i in range(num_requests):
            start = time.time()
            result = client.extract_hu_label_file(
                company_id, 
                warehouse_id, 
                sample_image
            )
            elapsed = time.time() - start
            times.append(elapsed * 1000)  # Convert to ms
            
            print(f"  Request {i+1}: {elapsed*1000:.1f}ms")
        
        # Calculate statistics
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        print(f"\nPerformance Summary:")
        print(f"  Average: {avg_time:.1f}ms")
        print(f"  Min: {min_time:.1f}ms")
        print(f"  Max: {max_time:.1f}ms")
        print(f"  Target: < 300ms")
        
        if avg_time < 300:
            print("✓ Performance test passed")
        else:
            print("✗ Performance test failed - exceeds 300ms target")
    
    except Exception as e:
        print(f"✗ Performance test failed: {e}")


if __name__ == "__main__":
    print("SCALES AI OCR Service - Test Client")
    print("=" * 50)
    
    # Run tests
    test_health()
    test_status()
    test_hu_label_extraction()
    test_performance()
    
    print("\n" + "=" * 50)
    print("Test suite completed")
