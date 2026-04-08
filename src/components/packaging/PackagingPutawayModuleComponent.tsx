/**
 * PUTAWAY MODULE COMPONENT
 * 
 * Allows operators to complete putaway tasks
 * Operator scans HU to verify placement at assigned location
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Check, AlertCircle, Loader, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRScanner } from '../qr-scanner/QRScanner';

interface PutawayTask {
  id: string;
  pallet_id: string;
  location_code: string;
  hu_label: string;
  product_name: string;
  qty: number;
  batch: string;
}

interface Props {
  warehouseId: string;
  companyId: string;
}

export function PackagingPutawayModuleComponent({ warehouseId, companyId }: Props) {
  const [tasks, setTasks] = useState<PutawayTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<PutawayTask | null>(null);
  const [huInput, setHuInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch pending putaway tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        warehouseId,
        companyId,
      });

      const response = await fetch(`/api/packaging/putaway-report?${params}`);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to fetch putaway tasks');
        setTasks([]);
        return;
      }

      // Convert putaway items to task format
      const taskList = (result.data || []).map((item: any) => ({
        id: item.id, // This is the putaway_task id
        pallet_id: item.pallet_id,
        location_code: item.location_code,
        hu_label: item.hu_label,
        product_name: item.product_name,
        qty: item.qty,
        batch: item.batch,
      }));

      setTasks(taskList);
    } catch (err) {
      console.error('Error fetching putaway tasks:', err);
      setError('An error occurred while fetching putaway tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, companyId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-select first task if available
  useEffect(() => {
    if (tasks.length > 0 && !selectedTask) {
      setSelectedTask(tasks[0]);
    } else if (tasks.length === 0) {
      setSelectedTask(null); 
    }
  }, [tasks, selectedTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTask || !huInput.trim()) {
      setError('Please select a task and enter HU code');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/packaging/complete-putaway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          putawayTaskId: selectedTask.id,
          palletId: selectedTask.pallet_id,
          huCode: huInput.trim(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to complete putaway');
        return;
      }

      setSuccessMessage(`✓ Pallet placed at ${selectedTask.location_code}. Status: STORED`);
      setHuInput('');

      // Refresh tasks after 2 seconds
      setTimeout(() => {
        fetchTasks();
        setSelectedTask(null);
        setSuccessMessage(null);
      }, 1000);
    } catch (err) {
      console.error('Error completing putaway:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-600">Loading putaway tasks...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Tasks List and Putaway Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending Tasks */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pending Tasks ({tasks.length})
            </h3>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No pending putaway tasks</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedTask?.id === task.id
                        ? 'border-blue-500 '
                        : 'border-gray-400 hover:border-gray-300 bg-primary-foreground'
                    }`}
                  >
                    <p className="font-mono text-sm font-semibold">{task.hu_label}</p>
                    <p className="text-xs text-gray-200 mt-1">
                      📍 {task.location_code}
                    </p>
                    <p className="text-xs text-gray-200">
                      {task.product_name} ({task.qty})
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Putaway Form */}
        <div className="lg:col-span-2">
          {selectedTask ? (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">Confirm Pallet Placement</h2>

              {/* Task Details */}
              <div className="rounded-lg p-4 mb-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600 text-wrap">HU Label</Label>
                    <p className="font-mono font-bold text-xs break-all">{selectedTask.hu_label}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Location</Label>
                    <p className="font-bold text-lg text-blue-600">
                      📍 {selectedTask.location_code}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Product</Label>
                    <p className="text-xs break-all">{selectedTask.product_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Batch</Label>
                    <p className="text-sm font-mono">{selectedTask.batch}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Quantity</Label>
                  <p className="text-sm font-semibold">{selectedTask.qty} units</p>
                </div>
              </div>

              {/* HU Verification Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="huCode" className="text-xs font-semibold">
                    Scan or Enter HU Code to Confirm:
                  </Label>
                  <Input
                    id="huCode"
                    type="text"
                    placeholder="Enter HU code..."
                    value={huInput}
                    onChange={(e) => setHuInput(e.target.value)}
                    disabled={submitting}
                    autoFocus
                    className="mt-2 text-xs font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Expected: <span className="font-mono font-semibold sm:text-xs">{selectedTask.hu_label}</span>
                  </p>
                </div>
                <QRScanner 
                  onScan={(payload) => setHuInput(payload.hu_code)}
                  // onError={(msg) => setError(msg)}
                />
                <Button
                  type="submit"
                  disabled={submitting || !huInput.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 gap-2 text-xs sm:text-xs"
                >
                  {submitting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirm & Update to STORED
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-gray-500 mt-4">
                Verify the HU code matches before confirming. This will mark the pallet as STORED.
              </p>
            </Card>
          ) : (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <Package className="h-12 w-12 text-gray-400" />
                <p className="text-gray-600">No task selected. Select a task from the list to begin.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
