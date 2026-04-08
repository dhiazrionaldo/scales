'use client';

/**
 * RECEIVING Component
 *
 * One-Click Inbound Power Action
 * Workflow: Capture → Result (merged Review + Confirm) → Success
 *
 * Features:
 * - Camera capture with live preview
 * - File upload fallback
 * - Real-time OCR integration with n8n webhook
 * - Confidence score validation
 * - Duplicate detection
 * - Location suggestion with dropdown selection
 * - Single-action confirmation
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Camera, CheckCircle, AlertCircle, Loader, RotateCcw, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '../ui/label';
import {QRScanner} from '../qr-scanner/QRScanner'

interface OCRResult {
  hu_label: string;
  product_name: string;
  qty: number;
  net_weight: number;
  batch: string;
  confidence: number;
  item_category: string;
  product_sku: string;
}

interface SuggestedLocation {
  location_id: string;
  location_code: string;
  capacity_available: number;
  distance_score: number;
  reasoning?: string;
}

interface PackagingReceivingComponentProps {
  warehouseId: string;
  companyId: string;
  onSuccess?: (data: {
    pallet_id: string;
    hu_label: string;
    location_code: string;
  }) => void;
}

type Step = 'CAPTURE' | 'RESULT' | 'SUCCESS';


interface PutawayTask {
  id: string;
  pallet_id: string;
  location_code: string;
  hu_label: string;
  product_name: string;
  qty: number;
  batch: string;
}

export function JITReceivingComponent({
  warehouseId,
  companyId,
  onSuccess,
}: PackagingReceivingComponentProps) {
  // ============ STATE ============
  const [step, setStep] = useState<Step>('CAPTURE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // putaway step
  const [tasks, setTasks] = useState<PutawayTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<PutawayTask | null>(null);
  // Capture step
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Result step
  const [palletId, setPalletId] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [suggestedLocations, setSuggestedLocations] = useState<SuggestedLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedLocationCode, setSelectedLocationCode] = useState<string>('');
  const [selectedLocationReasoning, setSelectedLocationReasoning] = useState<string | null>(null);
  
  // ============ CAMERA SETUP ============
  const startCamera = async () => {
    try {
      setError(null);
      setCameraDialogOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(`Camera error: ${message}`);
      setCameraDialogOpen(false);
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setCameraActive(false);
    setCameraDialogOpen(false);
  };

  // ============ IMAGE CAPTURE ============
  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setError(null);
      const context = canvasRef.current.getContext('2d');
      if (!context) return;

      // Set canvas dimensions to match video
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      // Draw video frame to canvas
      context.drawImage(videoRef.current, 0, 0);

      // Convert canvas to blob
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'hu-label.jpg', { type: 'image/jpeg' });
          setCapturedImage(file);
          setPreview(canvasRef.current?.toDataURL() || null);
          stopCamera();
          submitImage(file);
        }
      }, 'image/jpeg');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to capture image';
      setError(`Capture error: ${message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file format. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    setError(null);
    setCapturedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    submitImage(file);
  };

  // ============ IMAGE SUBMISSION ============
  const submitImage = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('warehouseId', warehouseId);
      formData.append('companyId', companyId);
      // Add timestamp to prevent caching of location data
      formData.append('_t', Date.now().toString());

      const response = await fetch('/api/just-in-time/receiving', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
     
      if (!response.ok) {
        setError(data.error || 'Failed to process image');
        setStep('CAPTURE');
        setLoading(false);
        return;
      }

      setPalletId(data.pallet.id);

      const result: OCRResult = {
        hu_label: data.pallet.hu_label,
        product_name: data.pallet.product_name,
        qty: data.pallet.qty,
        batch: data.pallet.batch,
        net_weight: data.pallet.net_weight,
        confidence: data.confidence,
        item_category: data.pallet.item_category,
      };

      const locations: SuggestedLocation[] = data.suggested_locations || [];

      // Debug logging
      console.log('[RECEIVING] API Response:', {
        pallet: data.pallet,
        suggested_locations_count: locations.length,
        suggested_locations: locations,
        full_response: data,
      });

      if (locations.length === 0) {
        console.warn('[RECEIVING] ⚠️ No locations returned from API. Check if:');
        console.warn('  1. Warehouse locations exist in database');
        console.warn('  2. Company ID matches: ', data.pallet?.company_id);
        console.warn('  3. Warehouse ID matches: ', data.pallet?.warehouse_id);
        console.warn('  4. API server logs for location suggestion errors');
      }

      setSuggestedLocations(locations);
      setOcrResult(result);

      // Auto-select the first suggested location
      if (locations.length > 0) {
        setSelectedLocationId(locations[0].location_id);
        setSelectedLocationCode(locations[0].location_code);
        setSelectedLocationReasoning(locations[0].reasoning || null);
      }

      setStep('RESULT');
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(`Submission error: ${message}`);
      setStep('CAPTURE');
      setLoading(false);
    }
  };

  // ============ HANDLE QR CODE SCANNING =======
  const submitJson = async (parsed: {
    hu_code: string;
    product_name: string;
    qty: number;
    batch: string;
    net_weight: number | string;
    product_sku: number | string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/just-in-time/qr-receiving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hu_code: parsed.hu_code,
          product_name: parsed.product_name,
          qty: Number(parsed.qty),
          batch: parsed.batch,
          net_weight: Number(parsed.net_weight),
          product_sku: parsed.product_sku,
          warehouseId,
          companyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process QR code');
        setLoading(false);
        return;
      }

      setPalletId(data.pallet.id);

      const result: OCRResult = {
        hu_label: data.pallet.hu_label,
        product_name: data.pallet.product_name,
        qty: data.pallet.qty,
        batch: data.pallet.batch,
        net_weight: data.pallet.net_weight,
        confidence: 1.0,
        item_category: data.pallet.item_category,
        product_sku: data.pallet.product_sku
      };

      const locations: SuggestedLocation[] = data.suggested_locations || [];
      setSuggestedLocations(locations);
      setOcrResult(result);

      if (locations.length > 0) {
        setSelectedLocationId(locations[0].location_id);
        setSelectedLocationCode(locations[0].location_code);
        setSelectedLocationReasoning(locations[0].reasoning || null);
      }

      setStep('RESULT');
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(`Submission error: ${message}`);
      setLoading(false);
    }
  };

  // ============ PUTAWAY CONFIRMATION ====
  const fetchTasks = useCallback(async (): Promise<PutawayTask[]> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ warehouseId, companyId });
      const response = await fetch(`/api/just-in-time/putaway-report?${params}`);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to fetch putaway tasks');
        setTasks([]);
        return [];
      }

      const taskList: PutawayTask[] = (result.data || []).map((item: any) => ({
        id: item.id,
        pallet_id: item.pallet_id,
        location_code: item.location_code,
        hu_label: item.hu_label,
        product_name: item.product_name,
        qty: item.qty,
        batch: item.batch,
      }));

      setTasks(taskList);
      return taskList; // ✅ Return directly so callers don't need to wait for state
    } catch (err) {
      console.error('Error fetching putaway tasks:', err);
      setError('An error occurred while fetching putaway tasks');
      setTasks([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [warehouseId, companyId]);

  // ============ CONFIRMATION ============
  const handleConfirm = async () => {
    if (!ocrResult || !palletId || !selectedLocationId) {
      setError('Please select a location before confirming');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/just-in-time/confirm-location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palletId: palletId,
          locationId: selectedLocationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to confirm location');
        setLoading(false);
        return;
      }

      // ✅ Fetch tasks and use the returned value directly — don't read state
      const freshTasks = await fetchTasks();
      const task = freshTasks.find(t => t.pallet_id === palletId) ?? freshTasks[0] ?? null;

      console.log('selectedTask (fresh):', task);

      if (task) {
        // ✅ Now wire up complete-putaway with the freshly fetched task
        const putawayResponse = await fetch('/api/just-in-time/complete-putaway', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            putawayTaskId: task.id,
            palletId: task.pallet_id,
            huCode: ocrResult.hu_label,
          }),
        });

        const putawayResult = await putawayResponse.json();

        if (!putawayResult.success) {
          setError(putawayResult.error || 'Failed to complete putaway');
          setLoading(false);
          return;
        }
      }

      onSuccess?.({
        pallet_id: palletId,
        hu_label: ocrResult.hu_label,
        location_code: selectedLocationCode,
      });

      setStep('SUCCESS');
      setLoading(false);

      setTimeout(() => resetComponent(), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Confirmation failed';
      setError(message);
      setLoading(false);
    }
  };
  // const handleConfirm = async () => {
  //   if (!ocrResult || !palletId || !selectedLocationId) {
  //     setError('Please select a location before confirming');
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     setError(null);

  //     // Call API to confirm pallet location
  //     const response = await fetch('/api/just-in-time/confirm-location', {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         palletId: palletId,
  //         locationId: selectedLocationId,
  //       }),
  //     });

  //     const data = await response.json();

  //     if (!response.ok) {
  //       setError(data.error || 'Failed to confirm location');
  //       setLoading(false);
  //       return;
  //     }

  //     // Success - notify parent and show success state
  //     onSuccess?.({
  //       pallet_id: palletId,
  //       hu_label: ocrResult.hu_label,
  //       location_code: selectedLocationCode,
  //     });

  //     setStep('SUCCESS');
  //     setLoading(false);

  //     // Auto-reset after 2 seconds
  //     setTimeout(() => {
  //       resetComponent();
  //     }, 2000);
  //   } catch (err) {
  //     const message = err instanceof Error ? err.message : 'Confirmation failed';
  //     setError(message);
  //     setLoading(false);
  //   }
  // };

  const resetComponent = () => {
    setStep('CAPTURE');
    setCapturedImage(null);
    setPreview(null);
    setOcrResult(null);
    setSuggestedLocations([]);
    setSelectedLocationId('');
    setSelectedLocationCode('');
    setSelectedLocationReasoning(null);
    setError(null);
    setLoading(false);
    setPalletId('');
  };

  // ============ RENDER ============
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* STEP 1: CAPTURE */}
      {step === 'CAPTURE' && (
        <>
          <Card className="p-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Step 1: Capture HU Label</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6">
              Scan or upload the HU label image. Ensure the label is clear and well-lit.
            </p>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-300">Processing image...</span>
              </div>
            )}

            {!loading && (
              <div className="space-y-4">
                {preview && (
                  <div className="mb-4">
                    <img src={preview} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                  </div>
                )}
                <button
                  onClick={startCamera}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white py-4 px-6 rounded-lg flex items-center justify-center gap-3"
                >
                  <Camera className="w-6 h-6" />
                  Start Camera
                </button>  

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-slate-300 text-gray-500">OR</span>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white py-4 px-6 rounded-lg flex items-center justify-center gap-3"
                >
                  <Upload className="w-6 h-6" />
                  Upload Image
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {/* This is the new QR Scanner component that should have the button on it */}
                <QRScanner 
                  onScan={(payload) => submitJson(payload)}
                  onError={(msg) => setError(msg)}
                />
              </div>
            )}
          </Card>

          {/* Camera Dialog */}
          <Dialog open={cameraDialogOpen} onOpenChange={setCameraDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Capture HU Label</DialogTitle>
                <DialogDescription>
                  Position the HU label in the viewfinder and tap Capture
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Video Element - Always in DOM */}
                <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-square">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={captureFromCamera}
                    disabled={loading || !cameraActive}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* RESULT STEP: OCR Result + Location Selection + Confirmation */}
      {step === 'RESULT' && ocrResult && (
        <Card className="p-6 relative">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">Storing pallet...</p>
              </div>
            </div>
          )}

          {/* Success message section */}
          {step === 'RESULT' && (
            <>
              {/* Confidence Alert */}
              <Label className='text-uppercase'>AI OCR</Label>
              <Alert className="mb-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 flex item-center gap-2">
                <CheckCircle  className="w-4 h-4"/>
                <AlertTitle className="text-green-800 dark:text-green-200 font-semibold">
                  Label scanned successfully — {(ocrResult.confidence * 100).toFixed(1)}% confidence
                </AlertTitle>
              </Alert>

              {/* HU Details as Badges */}
              <div className="mb-6 space-y-3">
              <Label className='text-uppercase'>SCANNED DETAIL</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs sm:text-sm py-2 px-3">
                    Product Name :{ocrResult.product_name}
                  </Badge>
                  <Badge variant="secondary" className="text-xs sm:text-sm py-2 px-3">
                    Product Category : {ocrResult.item_category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs sm:text-sm py-2 px-3">
                    <span className="font-mono">HU : {ocrResult.product_sku}</span>
                  </Badge>
                  <Badge variant="secondary" className="text-xs sm:text-sm py-2 px-3">
                    <span className="font-mono">Product Ref : {ocrResult.hu_label}</span>
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs sm:text-sm py-2 px-3">
                    {ocrResult.qty} pcs
                  </Badge>
                  <Badge variant="outline" className="text-xs sm:text-sm py-2 px-3">
                    Batch: <span className="font-mono ml-1">{ocrResult.batch}</span>
                  </Badge>
                  <Badge variant="outline" className="text-xs sm:text-sm py-2 px-3">
                    Weight: {ocrResult.net_weight} kg
                  </Badge>
                </div>
              </div>

              {/* Location Selection */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* AI Reasoning Alert */}
              <Label className='text-uppercase'>AI Reason</Label>
              <Alert className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex item-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-200 text-sm">
                  <span className="font-semibold">{selectedLocationCode}</span>: {selectedLocationReasoning}
                </AlertTitle>
              </Alert>
                
              

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Storage Location
                </label>
                <Select value={selectedLocationId} onValueChange={(locationId) => {
                  console.log('reasoning UI: ',selectedLocationReasoning);
                  setSelectedLocationId(locationId);
                  const location = suggestedLocations.find(loc => loc.location_id === locationId);
                  if (location) {
                    setSelectedLocationCode(location.location_code);
                    setSelectedLocationReasoning(location.reasoning || null);
                  }
                }}>
                  <SelectTrigger className="w-full text-base py-6 px-4">
                    <SelectValue placeholder="Select a storage location" />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedLocations.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500">
                        No locations available
                      </div>
                    ) : (
                      suggestedLocations.map((location, index) => {
                        const capacityPercent = parseFloat((location.capacity_available ?? 0).toFixed(1));
                        const isFull = capacityPercent <= 0;
                        // const statusBadge = capacityPercent > 75 ? '▲' : capacityPercent > 0 ? '✓' : '✗';
                         const statusBadge = index === 0 
                          ? <CheckCircleIcon width={20} height={20} color='green'/>
                          : capacityPercent > 75 
                          ? '▲' 
                          : capacityPercent > 0 
                          ? '✓' 
                          : <XCircleIcon width={20} height={20} color='red'/>;

                        return (
                          <SelectItem
                            key={location.location_id}
                            value={location.location_id}
                            disabled={isFull}
                            className={isFull ? 'opacity-50' : ''}
                          >
                            <span className="text-sm flex items-center gap-1">
                              {statusBadge} {location.location_code} ({capacityPercent}% free)
                            </span>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Confirm Button */}
              <div className="space-y-3">
                <Button
                  onClick={handleConfirm}
                  disabled={loading || !selectedLocationId}
                  className="w-full py-6 text-base sm:text-lg font-bold"
                  size="lg"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirm & Store in {selectedLocationCode}
                </Button>

                {/* Rescan Button */}
                <Button
                  onClick={() => resetComponent()}
                  variant="outline"
                  disabled={loading}
                  className="w-full py-4"
                >
                  <RotateCcw className="w-4 h-4" />
                  Rescan
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* SUCCESS STATE */}
      {step === 'SUCCESS' && ocrResult && (
        <Card className="p-6">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl sm:text-2xl font-bold text-green-600 mb-2">Pallet Stored Successfully!</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              HU {ocrResult.hu_label}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Location: {selectedLocationCode}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
