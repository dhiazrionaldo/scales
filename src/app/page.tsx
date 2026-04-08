"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Image from "next/image"
import logo from '@/asset/logo-white.png';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Image src={logo} alt="" className="mx-auto p-5 mb-4 h-15 w-26" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
