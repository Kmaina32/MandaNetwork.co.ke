
'use client';

import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Course } from "@/lib/mock-data";
import { Download, Printer, Loader2 } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from "react-qr-code";
import { Separator } from './ui/separator';

interface CertificateProps {
  course: Course;
  userName: string;
  certificateId: string;
  academicDirector: string;
}

const CertificateSeal = ({ className, color = '#002147' }: { className?: string, color?: string }) => (
  <svg
    viewBox="0 0 200 200"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <path
        id="circlePath"
        d="M 100, 100 m -60, 0 a 60,60 0 1,1 120,0 a 60,60 0 1,1 -120,0"
      />
    </defs>
    <circle cx="100" cy="100" r="95" fill="none" stroke={color} strokeWidth="2" />
    <circle cx="100" cy="100" r="90" fill="none" stroke={color} strokeWidth="1" strokeDasharray="5,5" />
    
    <g fill={color}>
      {Array.from({ length: 48 }).map((_, i) => (
        <path
          key={i}
          d="M100 15 L102 25 L98 25 Z"
          transform={`rotate(${i * 7.5}, 100, 100)`}
        />
      ))}
    </g>

    <circle cx="100" cy="100" r="75" fill="none" stroke={color} strokeWidth="2" />
    
    <text>
      <textPath href="#circlePath" fill={color} style={{ fontSize: '16px', letterSpacing: '2px', textTransform: 'uppercase' }}>
        Manda Network • Certified Professional •
      </textPath>
    </text>
    
    <g transform="translate(75, 75)">
        <path d="M22.5 0 L30 15 L45 15 L33.75 24 L37.5 39 L22.5 30 L7.5 39 L11.25 24 L0 15 L15 15 Z" fill={color} />
    </g>
  </svg>
);


export function Certificate({ course, userName, certificateId, academicDirector }: CertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Manda_Network_Certificate_${course.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="font-serif">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4"/>
          Print
        </Button>
        <Button onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4"/>
          )}
          Download PDF
        </Button>
      </div>

      {/* Certificate Container */}
      <div 
        ref={certificateRef} 
        className="max-w-5xl mx-auto bg-white p-2 shadow-2xl relative aspect-[1.414/1] print:shadow-none print:border-0"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
        {/* Intricate Border */}
        <div className="absolute inset-0 border-[10px] border-[#002147] p-2">
            <div className="w-full h-full border-2 border-[#C8A465]"></div>
        </div>

        {/* Watermark Seal */}
        <div className="absolute inset-0 flex justify-center items-center opacity-10 pointer-events-none">
            <CertificateSeal className="w-2/3 h-2/3" color="#002147" />
        </div>

        {/* Certificate Content */}
        <div className="relative z-10 flex flex-col h-full text-center p-8">
          
          <div className="flex justify-between items-center mb-4">
            <div className="text-left">
                <h1 className="font-bold text-2xl text-[#002147] font-headline">Manda Network</h1>
                <p className="text-sm text-gray-600">Online Professional Development</p>
            </div>
             <img src="/logo.png" alt="Manda Network Logo" className="h-16" />
          </div>

          <div className="flex-grow flex flex-col justify-center items-center">
            <p className="text-xl text-gray-700 tracking-wider">CERTIFICATE OF ACHIEVEMENT</p>
            <Separator className="my-2 bg-[#C8A465] h-[2px] w-1/3 mx-auto"/>
            <p className="text-md text-gray-600 mt-4">This certificate is hereby presented to</p>
            
            <p className="font-signature text-6xl text-gray-800 my-4">
              {userName}
            </p>

            <p className="text-md text-gray-600">
              for successfully completing the course
            </p>
            <p className="text-2xl font-bold text-[#002147] mt-2">
              {course.title}
            </p>
          </div>

          <div className="flex justify-between items-end mt-12 text-sm">
            <div className="text-center w-2/5">
                 <p className="font-signature text-4xl text-gray-800 -mb-4">{course.instructor}</p>
                <Separator className="bg-gray-600 mt-1"/>
                <p className="uppercase text-gray-600 mt-2 text-xs tracking-wider font-sans">Lead Instructor</p>
            </div>
            
             <div className="flex flex-col items-center">
                <CertificateSeal className="h-28 w-28" color="#002147" />
            </div>

            <div className="text-center w-2/5">
                <p className="font-signature text-4xl text-gray-800 -mb-4">{academicDirector}</p>
                <Separator className="bg-gray-600 mt-1"/>
                <p className="uppercase text-gray-600 mt-2 text-xs tracking-wider font-sans">Academic Director</p>
            </div>
          </div>
           <div className="flex justify-between items-end text-[10px] text-gray-500 mt-4">
                <span>Issued on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <div className="flex items-center gap-2">
                    <QRCode value={`https://www.mandanetwork.co.ke/verify/${certificateId}`} size={24} bgColor="transparent" fgColor="#002147" />
                    <span>Verify at manda.network/verify</span>
                </div>
                <span>ID: {certificateId}</span>
           </div>

        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body, html {
            background-color: white;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
