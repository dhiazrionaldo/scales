"use client";
import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useReactToPrint } from "react-to-print";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const QRGeneratorPage: React.FC = () => {
  const [hu_code, sethu_code] = useState("");
  const [product_sku, setproduct_sku] = useState("");
  const [product_name, setproduct_name] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [batch, setBatch] = useState("");
  const [net_weight, setNetWeight] = useState("");
  const [qrData, setQrData] = useState("");

  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: labelRef,
    documentTitle: `Label-${hu_code}`,
    pageStyle: `
      @page {
        size: 148mm 105mm;
        margin: 0;
      }
      body {
        margin: 0;
      }
    `,
  });

  const generateQRCode = () => {
    if (hu_code && product_name && qty > 0 && batch) {
      const data = JSON.stringify({ product_sku, hu_code, product_name, qty, batch, net_weight });
      setQrData(data);
    } else {
      alert("Please fill in all fields.");
    }
  };

  return (
    <div className="flex flex-row items-start justify-center min-h-screen p-8 gap-6">
      {/* Left — form */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">HU QR Code Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="product_sku">HU Code</Label>
            <Input id="hu_code" value={product_sku} onChange={(e) => setproduct_sku(e.target.value)} placeholder="Enter HU Code" />
          </div>
          <div>
            <Label htmlFor="hu_code">Product Name</Label>
            <Input id="hu_code" value={hu_code} onChange={(e) => sethu_code(e.target.value)} placeholder="Enter HU Code" />
          </div>
          <div>
            <Label htmlFor="product_name">Model Name</Label>
            <Input id="product_name" value={product_name} onChange={(e) => setproduct_name(e.target.value)} placeholder="Enter Product Name" />
          </div>
          <div>
            <Label htmlFor="qty">Quantity</Label>
            <Input id="qty" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} placeholder="Enter Quantity" />
          </div>
          <div>
            <Label htmlFor="batch">Batch</Label>
            <Input id="batch" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Enter Batch" />
          </div>
          <div>
            <Label htmlFor="net_weight">Net. Weight</Label>
            <Input id="net_weight" value={net_weight} onChange={(e) => setNetWeight(e.target.value)} placeholder="Enter Nett Weight" />
          </div>
          <Button onClick={generateQRCode} className="w-full">
            Generate QR Code
          </Button>
        </CardContent>
      </Card>

      {/* Right — label preview */}
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-center w-full">Label Preview</CardTitle>
          {qrData && (
            <Button variant="outline" size="sm" onClick={() => handlePrint()} className="shrink-0 ml-2">
              🖨 Print
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[420px]">
          {!qrData ? (
            <p className="text-sm text-muted-foreground">
              Fill in the form and click Generate to preview the label.
            </p>
          ) : (
            // This div is what react-to-print will capture
            <div
              ref={labelRef}
              style={{
                width: "100%",
                border: "2px solid #111",
                fontFamily: "'Courier New', monospace",
                backgroundColor: "#fff",
                color: "#111",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Header */}
              <div style={{ backgroundColor: "#111", color: "#fff", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em" }}>MULIAGLASS SAFETY DIVISION</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>PRODUCT LABEL</span>
              </div>

              {/* Body */}
              <div style={{ display: "flex", padding: "10px 12px", gap: "12px" }}>
                <div style={{ flexShrink: 0, border: "1px solid #ddd", padding: "6px" }}>
                  <QRCodeSVG value={qrData} size={100} level="H" />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div>
                    <div style={{ fontSize: "9px", color: "#666", textTransform: "uppercase", letterSpacing: "0.08em" }}>Product</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.2 }}>{product_name}</div>
                  </div>
                  <div style={{ borderTop: "1px solid #eee" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <LabelField label="HU Code" value={hu_code} />
                    <LabelField label="Batch No." value={batch} />
                    <LabelField label="Quantity" value={String(qty)} />
                    <LabelField label="Net Weight" value={`${net_weight} kg`} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: "1px solid #ddd", padding: "5px 12px", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#888" }}>
                <span>Created At</span>
                <span>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>{qrData}</CardFooter>
      </Card>
    </div>
  );
};

function LabelField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "8px", color: "#888", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontSize: "12px", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default QRGeneratorPage;
// "use client";
// import React, { useState } from 'react';
// import { QRCodeSVG } from 'qrcode.react';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Label } from '@/components/ui/label';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// const QRGeneratorPage: React.FC = () => {
//   const [huCode, setHuCode] = useState<string>('');
//   const [productName, setProductName] = useState<string>('');
//   const [qty, setQty] = useState<number>(0);
//   const [batch, setBatch] = useState<string>('');
//   const [net_weight, setNetWeight] = useState<string>('');
//   const [qrData, setQrData] = useState<string>('');

//   const generateQRCode = () => {
//     if (huCode && productName && qty > 0 && batch) {
//       const data = JSON.stringify({
//         huCode,
//         productName,
//         qty,
//         batch,
//       });
//       setQrData(data);
//     } else {
//       alert('Please fill in all fields.');
//     }
//   };

//   return (
//     <div className="flex flex-col-2 items-center justify-center min-h-screen p-4 gap-3">
//       <Card className="w-full max-w-md">
//         <CardHeader>
//           <CardTitle className="text-center">HU QR Code Generator</CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div>
//             <Label htmlFor="huCode">HU Code</Label>
//             <Input
//               id="huCode"
//               value={huCode}
//               onChange={(e) => setHuCode(e.target.value)}
//               placeholder="Enter HU Code"
//             />
//           </div>
//           <div>
//             <Label htmlFor="productName">Product Name</Label>
//             <Input
//               id="productName"
//               value={productName}
//               onChange={(e) => setProductName(e.target.value)}
//               placeholder="Enter Product Name"
//             />
//           </div>
//           <div>
//             <Label htmlFor="qty">Quantity</Label>
//             <Input
//               id="qty"
//               type="number"
//               value={qty}
//               onChange={(e) => setQty(Number(e.target.value))}
//               placeholder="Enter Quantity"
//             />
//           </div>
//           <div>
//             <Label htmlFor="batch">Batch</Label>
//             <Input
//               id="batch"
//               value={batch}
//               onChange={(e) => setBatch(e.target.value)}
//               placeholder="Enter Batch"
//             />
//           </div>
//           <div>
//             <Label htmlFor="net_weight">Net. Weight</Label>
//             <Input
//               id="net_weight"
//               value={net_weight}
//               onChange={(e) => setNetWeight(e.target.value)}
//               placeholder="Enter Nett Weight"
//             />
//           </div>
//           <Button onClick={generateQRCode} className="w-full">
//             Generate QR Code
//           </Button>
//         </CardContent>
//       </Card>
//       <Card className="w-full max-w-md">
//         <CardHeader>
//           <CardTitle className="text-center">Example QR Code</CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           {qrData && (
//             <div className="flex flex-col items-center mt-6">
//               <Label className="mb-2">Scan this QR Code</Label>
//               <QRCodeSVG value={qrData} size={256} level="H" />
//               {/* <p className="mt-2 text-sm text-gray-500 break-all">Data: {qrData}</p> */}
//               <div className='flex flex-cols-2 gap-3'>
//                 <p className="mt-2 text-sm text-gray-500 break-all">HU Code: {huCode}</p>
//                 <p className="mt-2 text-sm text-gray-500 break-all">Product Name: {productName}</p>
//               </div>
//               <div className='flex flex-cols-1 gap-3'>
//                 <p className="mt-2 text-sm text-gray-500 break-all">Quantity: {qty}</p>
//                 <p className="mt-2 text-sm text-gray-500 break-all">Batch: {batch}</p>
//                 <p className="mt-2 text-sm text-gray-500 break-all">Net. Weight: {net_weight}</p>
//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default QRGeneratorPage;