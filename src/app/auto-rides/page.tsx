"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Car,
  Fuel,
  TrendingUp,
  TrendingDown,
  Gauge,
  Wallet,
  Calendar,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit3,
  Download,
  Clock,
  MapPin,
  ArrowRight,
  Zap,
  Sparkles,
  Banknote,
  Smartphone,
  Wrench,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import * as XLSX from "xlsx";

export default function AutoRidesPage() {
  const { t, language, formatCurrency, formatDate } = useLanguage();
  const isTe = language === "te";

  // Selected date filter (default: today)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Tab state
  const [activeTab, setActiveTab] = useState<"rides" | "expenses" | "daily_logs">("rides");

  // Data states
  const [rides, setRides] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dailyLog, setDailyLog] = useState<any | null>(null);
  const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Ride Logger state (on top of rides tab)
  const [quickFare, setQuickFare] = useState("");
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [quickPickup, setQuickPickup] = useState("");
  const [quickDrop, setQuickDrop] = useState("");
  const [quickRideType, setQuickRideType] = useState("LOCAL");
  const [quickLoading, setQuickLoading] = useState(false);

  // Modals
  const [showAddRideModal, setShowAddRideModal] = useState(false);
  const [editingRide, setEditingRide] = useState<any | null>(null);

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const [showMeterModal, setShowMeterModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Ride Form States
  const [rideDate, setRideDate] = useState(selectedDate);
  const [rideType, setRideType] = useState("LOCAL");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [fareAmount, setFareAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [passengerCount, setPassengerCount] = useState("1");
  const [distanceKm, setDistanceKm] = useState("");
  const [rideNotes, setRideNotes] = useState("");
  const [savingRide, setSavingRide] = useState(false);

  // Expense Form States
  const [expenseDate, setExpenseDate] = useState(selectedDate);
  const [expenseCategory, setExpenseCategory] = useState("CNG_GAS");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [fuelQuantity, setFuelQuantity] = useState("");
  const [expenseMeterKm, setExpenseMeterKm] = useState("");
  const [expensePayMethod, setExpensePayMethod] = useState("CASH");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [deductFromAccount, setDeductFromAccount] = useState(false);
  const [expenseNotes, setExpenseNotes] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  // Meter Form States
  const [startMeter, setStartMeter] = useState("");
  const [endMeter, setEndMeter] = useState("");
  const [meterNotes, setMeterNotes] = useState("");
  const [savingMeter, setSavingMeter] = useState(false);

  // Deposit Form States
  const [depositAmount, setDepositAmount] = useState("");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [depositPayMethod, setDepositPayMethod] = useState("CASH");
  const [depositNotes, setDepositNotes] = useState("");
  const [savingDeposit, setSavingDeposit] = useState(false);

  // Fetch all auto data for the selected date
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ridesRes, expRes, logRes, logsListRes, accsRes] = await Promise.all([
        fetch(`/api/auto/rides?date=${selectedDate}`),
        fetch(`/api/auto/expenses?date=${selectedDate}`),
        fetch(`/api/auto/daily-log?date=${selectedDate}`),
        fetch(`/api/auto/daily-log?days=30`),
        fetch("/api/accounts"),
      ]);

      if (ridesRes.ok) {
        const data = await ridesRes.json();
        setRides(data.rides || []);
      }
      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
      }
      if (logRes.ok) {
        const data = await logRes.json();
        setDailyLog(data);
        if (data?.startMeterKm) setStartMeter(data.startMeterKm.toString());
        if (data?.endMeterKm) setEndMeter(data.endMeterKm.toString());
      }
      if (logsListRes.ok) {
        const data = await logsListRes.json();
        setAllDailyLogs(Array.isArray(data) ? data : []);
      }
      if (accsRes.ok) {
        const data = await accsRes.json();
        if (Array.isArray(data)) {
          setAccounts(data);
          if (data.length > 0 && !expenseAccountId) {
            setExpenseAccountId(data[0].id);
            setDepositAccountId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load auto data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    const handleDataChanged = () => fetchData();
    window.addEventListener("finance_data_changed", handleDataChanged);
    return () => window.removeEventListener("finance_data_changed", handleDataChanged);
  }, [selectedDate]);

  // Derived Financial Metrics
  const totalRidesCount = rides.length;
  const cashRidesTotal = rides
    .filter((r) => r.paymentMethod === "CASH")
    .reduce((sum, r) => sum + r.fareAmount, 0);
  const upiRidesTotal = rides
    .filter((r) => r.paymentMethod !== "CASH")
    .reduce((sum, r) => sum + r.fareAmount, 0);
  const totalGrossEarnings = cashRidesTotal + upiRidesTotal;

  const totalFuelCost = expenses
    .filter((e) => e.category === "CNG_GAS" || e.category === "PETROL_DIESEL")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOtherExpenses = expenses
    .filter((e) => e.category !== "CNG_GAS" && e.category !== "PETROL_DIESEL")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = totalFuelCost + totalOtherExpenses;
  const netTakeHomeProfit = totalGrossEarnings - totalExpenses;

  // Kilometer & Mileage calculations
  const totalKmRun =
    dailyLog?.totalKm ||
    (dailyLog?.startMeterKm && dailyLog?.endMeterKm && dailyLog.endMeterKm >= dailyLog.startMeterKm
      ? dailyLog.endMeterKm - dailyLog.startMeterKm
      : null);

  const totalFuelQuantity = expenses
    .filter((e) => (e.category === "CNG_GAS" || e.category === "PETROL_DIESEL") && e.fuelLitersOrKg)
    .reduce((sum, e) => sum + (e.fuelLitersOrKg || 0), 0);

  const mileageKmPerUnit =
    totalKmRun && totalFuelQuantity && totalFuelQuantity > 0
      ? (totalKmRun / totalFuelQuantity).toFixed(1)
      : null;

  const earningPerKm =
    totalKmRun && totalKmRun > 0 && totalGrossEarnings > 0
      ? (totalGrossEarnings / totalKmRun).toFixed(1)
      : null;

  // Quick 1-Click Ride Logger Submit
  const handleQuickRide = async (e: React.FormEvent) => {
    e.preventDefault();
    const fare = parseFloat(quickFare);
    if (isNaN(fare) || fare <= 0) {
      alert(isTe ? "దయచేసి సరైన మొత్తం నమోదు చేయండి" : "Please enter a valid fare");
      return;
    }

    setQuickLoading(true);
    try {
      const res = await fetch("/api/auto/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideDate: selectedDate,
          rideType: quickRideType,
          pickupLocation: quickPickup.trim() || undefined,
          dropLocation: quickDrop.trim() || undefined,
          fareAmount: fare,
          paymentMethod: quickPaymentMethod,
        }),
      });

      if (res.ok) {
        setQuickFare("");
        setQuickPickup("");
        setQuickDrop("");
        fetchData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record ride");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setQuickLoading(false);
    }
  };

  // Full Ride Modal Submit (Add or Edit)
  const handleSaveRide = async (e: React.FormEvent) => {
    e.preventDefault();
    const fare = parseFloat(fareAmount);
    if (isNaN(fare) || fare <= 0) {
      alert(isTe ? "దయచేసి సరైన మొత్తం నమోదు చేయండి" : "Please enter a valid fare");
      return;
    }

    setSavingRide(true);
    try {
      const url = editingRide ? `/api/auto/rides/${editingRide.id}` : "/api/auto/rides";
      const method = editingRide ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideDate,
          rideType,
          pickupLocation,
          dropLocation,
          fareAmount: fare,
          paymentMethod,
          passengerCount,
          distanceKm,
          notes: rideNotes,
        }),
      });

      if (res.ok) {
        setShowAddRideModal(false);
        setEditingRide(null);
        resetRideForm();
        fetchData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save ride");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setSavingRide(false);
    }
  };

  const resetRideForm = () => {
    setFareAmount("");
    setPickupLocation("");
    setDropLocation("");
    setRideType("LOCAL");
    setPaymentMethod("CASH");
    setPassengerCount("1");
    setDistanceKm("");
    setRideNotes("");
  };

  const handleOpenEditRide = (ride: any) => {
    setEditingRide(ride);
    setRideDate(new Date(ride.rideDate).toISOString().split("T")[0]);
    setRideType(ride.rideType || "LOCAL");
    setPickupLocation(ride.pickupLocation || "");
    setDropLocation(ride.dropLocation || "");
    setFareAmount(ride.fareAmount.toString());
    setPaymentMethod(ride.paymentMethod || "CASH");
    setPassengerCount(ride.passengerCount?.toString() || "1");
    setDistanceKm(ride.distanceKm?.toString() || "");
    setRideNotes(ride.notes || "");
    setShowAddRideModal(true);
  };

  const handleDeleteRide = async (id: string) => {
    if (!confirm(isTe ? "ఈ రైడ్ రికార్డును తొలగించాలనుకుంటున్నారా?" : "Are you sure you want to delete this ride?")) return;
    try {
      const res = await fetch(`/api/auto/rides/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Full Expense Modal Submit (Add or Edit)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(isTe ? "దయచేసి సరైన ఖర్చు మొత్తం నమోదు చేయండి" : "Please enter a valid expense amount");
      return;
    }

    setSavingExpense(true);
    try {
      const url = editingExpense ? `/api/auto/expenses/${editingExpense.id}` : "/api/auto/expenses";
      const method = editingExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseDate,
          category: expenseCategory,
          title: expenseTitle,
          amount: amt,
          fuelLitersOrKg: fuelQuantity,
          meterReadingKm: expenseMeterKm,
          paymentMethod: expensePayMethod,
          accountId: expenseAccountId,
          deductFromAccount,
          notes: expenseNotes,
        }),
      });

      if (res.ok) {
        setShowAddExpenseModal(false);
        setEditingExpense(null);
        resetExpenseForm();
        fetchData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save expense");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setSavingExpense(false);
    }
  };

  const resetExpenseForm = () => {
    setExpenseAmount("");
    setExpenseTitle("");
    setExpenseCategory("CNG_GAS");
    setFuelQuantity("");
    setExpenseMeterKm("");
    setExpensePayMethod("CASH");
    setDeductFromAccount(false);
    setExpenseNotes("");
  };

  const handleOpenEditExpense = (exp: any) => {
    setEditingExpense(exp);
    setExpenseDate(new Date(exp.expenseDate).toISOString().split("T")[0]);
    setExpenseCategory(exp.category);
    setExpenseTitle(exp.title || "");
    setExpenseAmount(exp.amount.toString());
    setFuelQuantity(exp.fuelLitersOrKg?.toString() || "");
    setExpenseMeterKm(exp.meterReadingKm?.toString() || "");
    setExpensePayMethod(exp.paymentMethod || "CASH");
    setExpenseNotes(exp.notes || "");
    setShowAddExpenseModal(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm(isTe ? "ఈ ఖర్చు రికార్డును తొలగించాలనుకుంటున్నారా?" : "Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`/api/auto/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        window.dispatchEvent(new Event("finance_data_changed"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Meter Reading Submit
  const handleSaveMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMeter(true);
    try {
      const res = await fetch("/api/auto/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          startMeterKm: startMeter,
          endMeterKm: endMeter,
          notes: meterNotes,
        }),
      });

      if (res.ok) {
        setShowMeterModal(false);
        fetchData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save meter readings");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setSavingMeter(false);
    }
  };

  // Deposit Net Profit to Account Submit
  const handleDepositEarnings = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(isTe ? "దయచేసి సరైన మొత్తం నమోదు చేయండి" : "Please enter a valid deposit amount");
      return;
    }

    setSavingDeposit(true);
    try {
      const res = await fetch("/api/auto/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          accountId: depositAccountId,
          date: selectedDate,
          paymentMethod: depositPayMethod,
          notes: depositNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || (isTe ? "లాభం ఖాతాలో విజయవంతంగా జమ చేయబడింది!" : "Earnings deposited successfully!"));
        setShowDepositModal(false);
        fetchData();
        window.dispatchEvent(new Event("finance_data_changed"));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to deposit earnings");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setSavingDeposit(false);
    }
  };

  // Export Daily Logs to Excel
  const exportAutoExcel = () => {
    const rows = allDailyLogs.map((log) => ({
      Date: formatDate(log.date),
      "Total Rides": log.totalRidesCount,
      "Total KM": log.totalKm || "N/A",
      "Gross Earnings (₹)": log.totalEarnings,
      "Cash (₹)": log.cashEarnings,
      "UPI (₹)": log.upiEarnings,
      "Fuel Cost (₹)": log.totalFuelCost,
      "Other Expenses (₹)": log.totalOtherExpenses,
      "Net Profit (₹)": log.netProfit,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auto Business Report");
    XLSX.writeFile(wb, `Auto_Business_Report_${selectedDate}.xlsx`);
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "CNG_GAS":
        return isTe ? "గ్యాస్ (CNG Gas)" : "CNG Gas";
      case "PETROL_DIESEL":
        return isTe ? "పెట్రోల్ / డీజిల్" : "Petrol / Diesel";
      case "OIL_GREASE":
        return isTe ? "2T ఆయిల్ & గ్రీస్" : "2T Oil & Grease";
      case "TYRE_PUNCTURE":
        return isTe ? "టైర్ / పంచర్" : "Tyre & Puncture";
      case "AUTO_WASH":
        return isTe ? "వాషింగ్ & క్లీనింగ్" : "Washing & Cleaning";
      case "MAINTENANCE":
        return isTe ? "సర్వీసింగ్ & రిపేర్లు" : "Repairs & Service";
      case "STAND_UNION_FEE":
        return isTe ? "స్టాండ్ / యూనియన్ ఫీజు" : "Stand / Union Fee";
      case "CHALLAN_FINE":
        return isTe ? "ట్రాఫిక్ చలానా" : "Traffic Challan / Fine";
      case "AUTO_EMI":
        return isTe ? "ఆటో EMI / లోన్" : "Auto EMI / Loan";
      case "INSURANCE_PERMIT":
        return isTe ? "ఇన్సూరెన్స్ & పర్మిట్" : "Insurance & Permit";
      default:
        return isTe ? "ఇతర ఆటో ఖర్చులు" : "Other Expense";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto pb-16">
      {/* 1. Header & Date Selection Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
            <Car size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isTe ? "ఆటో రైడ్స్ & రోజువారీ ఖర్చులు" : "Auto Rickshaw Rides & Expenses"}
              </h1>
              <Badge className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5">
                {isTe ? "ఆటో మేనేజర్" : "Auto Pro"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isTe
                ? "రోజువారీ సవారీలు, గ్యాస్/పెట్రోల్, మరమ్మతులు, మీటర్ రీడింగ్ మరియు నికర లాభాల సమగ్ర ట్రాకింగ్."
                : "Track daily passenger rides, CNG/fuel costs, maintenance, meter reading, and daily net take-home profit."}
            </p>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
            {selectedDate !== new Date().toISOString().split("T")[0] && (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-md hover:bg-amber-600"
              >
                {isTe ? "నేడు" : "Today"}
              </button>
            )}
          </div>

          {/* Meter Reading Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowMeterModal(true);
            }}
            className="border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Gauge size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>{isTe ? "మీటర్ KM" : "Meter (KM)"}</span>
          </Button>

          {/* Deposit Net Profit Button */}
          {netTakeHomeProfit > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setDepositAmount(netTakeHomeProfit.toString());
                setShowDepositModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Wallet size={14} />
              <span>{isTe ? "లాభాన్ని జమ చేయి" : "Deposit Profit"}</span>
            </Button>
          )}

          {/* + Add Ride Modal Button */}
          <Button
            size="sm"
            onClick={() => {
              setEditingRide(null);
              resetRideForm();
              setRideDate(selectedDate);
              setShowAddRideModal(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusCircle size={14} />
            <span>{isTe ? "+ కొత్త రైడ్" : "+ Add Ride"}</span>
          </Button>

          {/* + Add Expense Button */}
          <Button
            size="sm"
            onClick={() => {
              setEditingExpense(null);
              resetExpenseForm();
              setExpenseDate(selectedDate);
              setShowAddExpenseModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Fuel size={14} />
            <span>{isTe ? "+ ఖర్చు / గ్యాస్" : "+ Fuel / Expense"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Overview Cards (Live Auto Financial Pulse) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Total Rides Gross Earnings */}
        <Card className="border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                {isTe ? "నేటి మొత్తం సంపాదన" : "Gross Rides Earnings"}
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(totalGrossEarnings)}
              </span>
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">
                  {totalRidesCount} {isTe ? "రైడ్స్" : "Rides"}
                </span>
                <span>•</span>
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                  <Banknote size={12} /> {formatCurrency(cashRidesTotal)}
                </span>
                <span>•</span>
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                  <Smartphone size={12} /> {formatCurrency(upiRidesTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Today's Fuel / Gas (CNG / Petrol) Cost */}
        <Card className="border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                {isTe ? "గ్యాస్ & పెట్రోల్ ఖర్చు" : "CNG & Fuel Cost"}
              </span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-bold">
                <Fuel size={16} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(totalFuelCost)}
              </span>
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {totalFuelQuantity > 0 ? (
                  <span>
                    {totalFuelQuantity} {isTe ? "కిలోలు / లీటర్లు" : "Kg / Liters filled"}
                  </span>
                ) : (
                  <span>{isTe ? "ఇంధనం ఖర్చులు" : "Fuel consumption"}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Other Auto Expenses (Repairs, Wash, Stand, Challan) */}
        <Card className="border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-slate-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                {isTe ? "మరమ్మతులు & ఇతర ఖర్చులు" : "Repairs & Stand Fees"}
              </span>
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 font-bold">
                <Wrench size={16} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(totalOtherExpenses)}
              </span>
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>{isTe ? "మొత్తం ఖర్చులు:" : "Total all expenses:"} </span>
                <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(totalExpenses)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Net Take-Home Auto Profit (చేతికి మిగిలిన నికర లాభం) */}
        <Card className="border-indigo-300 dark:border-indigo-800 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-indigo-100">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {isTe ? "చేతికి మిగిలిన నికర లాభం" : "Net Take-Home Profit"}
              </span>
              <div className="p-2 rounded-xl bg-white/20 text-white font-bold">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatCurrency(netTakeHomeProfit)}
              </span>
              <div className="flex items-center justify-between mt-2 text-xs font-bold text-indigo-100">
                <span>
                  {totalGrossEarnings > 0
                    ? `${Math.round((netTakeHomeProfit / totalGrossEarnings) * 100)}% ${isTe ? "లాభం" : "margin"}`
                    : isTe ? "లాభం లెక్కించబడుతుంది" : "Calculated daily"}
                </span>
                {totalKmRun && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                    {totalKmRun} KM
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. FAST QUICK RIDE LOGGER BAR (Drivers can log fares in 2 seconds while on the road) */}
      <Card className="border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-600 fill-amber-500" />
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">
                {isTe ? "ఫాస్ట్ రైడ్ ఎంట్రీ (2 సెకన్లలో నమోదు)" : "Fast 1-Click Ride Logger"}
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              {formatDate(selectedDate)}
            </span>
          </div>

          <form onSubmit={handleQuickRide} className="space-y-3">
            {/* Quick Fare Shortcut Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">
                {isTe ? "త్వరిత మొత్తం:" : "Quick Fares:"}
              </span>
              {[50, 80, 100, 150, 200, 250, 300, 400, 500].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setQuickFare(amt.toString())}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    quickFare === amt.toString()
                      ? "bg-amber-600 text-white shadow-xs scale-105"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Input Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Fare input */}
              <div className="sm:col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={isTe ? "కిరాయి మొత్తం" : "Fare Amount (₹)"}
                  value={quickFare}
                  onChange={(e) => setQuickFare(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm"
                />
              </div>

              {/* Payment Method toggle */}
              <div className="sm:col-span-3 flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setQuickPaymentMethod("CASH")}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    quickPaymentMethod === "CASH"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Banknote size={13} />
                  <span>{isTe ? "నగదు (Cash)" : "Cash"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPaymentMethod("UPI")}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    quickPaymentMethod === "UPI"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Smartphone size={13} />
                  <span>{isTe ? "UPI / GPay" : "UPI"}</span>
                </button>
              </div>

              {/* Pickup location */}
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder={isTe ? "ఎక్కడి నుండి (స్టాప్)" : "Pickup (Optional)"}
                  value={quickPickup}
                  onChange={(e) => setQuickPickup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Drop location */}
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder={isTe ? "ఎక్కడికి (లొకేషన్)" : "Drop (Optional)"}
                  value={quickDrop}
                  onChange={(e) => setQuickDrop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Add Button */}
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={quickLoading}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <PlusCircle size={15} />
                  <span>{quickLoading ? (isTe ? "నమోదు..." : "Saving...") : isTe ? "+ రైడ్ జోడించు" : "+ Log Ride"}</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 4. Tab Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("rides")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "rides"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Car size={15} />
            <span>{isTe ? "రైడ్ల జాబితా (సవారీలు)" : "Rides Log"}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {rides.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "expenses"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Fuel size={15} />
            <span>{isTe ? "ఆటో ఖర్చులు & గ్యాస్" : "Expenses & Fuel"}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {expenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("daily_logs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "daily_logs"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Gauge size={15} />
            <span>{isTe ? "రోజువారీ లెక్కలు & KM మైలేజ్" : "Daily Logs & Mileage"}</span>
          </button>
        </div>

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={exportAutoExcel}
          className="text-xs font-bold flex items-center gap-1.5"
        >
          <FileSpreadsheet size={14} className="text-emerald-600" />
          <span>{isTe ? "ఎక్సెల్ రిపోర్ట్" : "Export Report"}</span>
        </Button>
      </div>

      {/* 5. TAB 1: RIDES LOG */}
      {activeTab === "rides" && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block h-8 w-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rides.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Car size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isTe ? "ఈ తేదీన ఎలాంటి రైడ్లు నమోదు కాలేదు" : "No auto rides recorded for this date"}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isTe
                    ? "పైనున్న ఫాస్ట్ రైడ్ ఎంట్రీ లేదా '+ కొత్త రైడ్' బటన్ ద్వారా సవారీ కిరాయిని నమోదు చేయండి."
                    : "Use the fast ride logger above or click '+ Add Ride' to record fares."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {rides.map((ride, idx) => {
                const isCash = ride.paymentMethod === "CASH";
                const rideTime = new Date(ride.rideDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <Card
                    key={ride.id}
                    className="overflow-hidden border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-xs"
                  >
                    <div className="p-4 flex flex-col justify-between h-full space-y-3">
                      <div>
                        {/* Header: Ride #, Time, Payment badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                            {isTe ? `రైడ్ #${rides.length - idx}` : `Trip #${rides.length - idx}`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                              <Clock size={11} /> {rideTime}
                            </span>
                            <Badge variant={isCash ? "success" : "info"} className="text-[10px] font-bold">
                              {isCash ? (isTe ? "నగదు" : "Cash") : "UPI / PhonePe"}
                            </Badge>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="mt-2.5 flex items-baseline justify-between">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {formatCurrency(ride.fareAmount)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-bold uppercase">
                            {ride.rideType === "HIRE"
                              ? isTe ? "బుకింగ్ / హైర్" : "Special Hire"
                              : ride.rideType === "SHARING"
                              ? isTe ? "షేరింగ్ ఆటో" : "Sharing Ride"
                              : isTe ? "లోకల్ సవారీ" : "Local Ride"}
                          </span>
                        </div>

                        {/* Pickup & Drop Route if available */}
                        {(ride.pickupLocation || ride.dropLocation) && (
                          <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <MapPin size={12} className="text-emerald-600 shrink-0" />
                              <span className="font-semibold truncate">
                                {ride.pickupLocation || (isTe ? "స్టాప్" : "Pickup")}
                              </span>
                              <ArrowRight size={10} className="text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {ride.dropLocation || (isTe ? "గమ్యస్థానం" : "Drop")}
                              </span>
                            </div>
                            {ride.distanceKm && (
                              <span className="text-[10px] text-slate-400 block">
                                {ride.distanceKm} KM {ride.passengerCount ? `• ${ride.passengerCount} ${isTe ? "ప్రయాణికులు" : "passengers"}` : ""}
                              </span>
                            )}
                          </div>
                        )}

                        {ride.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 italic">
                            &ldquo;{ride.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleOpenEditRide(ride)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
                        >
                          <Edit3 size={13} />
                          <span>{isTe ? "సవరించు" : "Edit"}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRide(ride.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
                        >
                          <Trash2 size={13} />
                          <span>{isTe ? "తొలగించు" : "Delete"}</span>
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 2: EXPENSES & FUEL */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block h-8 w-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Fuel size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isTe ? "ఈ తేదీన ఎలాంటి ఆటో ఖర్చులు నమోదు కాలేదు" : "No auto expenses recorded for this date"}
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingExpense(null);
                    resetExpenseForm();
                    setExpenseDate(selectedDate);
                    setShowAddExpenseModal(true);
                  }}
                  className="bg-rose-600 text-white text-xs mt-3"
                >
                  <PlusCircle size={14} className="mr-1" />
                  {isTe ? "+ ఇంధనం / ఖర్చు జోడించండి" : "+ Add Auto Expense"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {expenses.map((exp) => {
                const isFuel = exp.category === "CNG_GAS" || exp.category === "PETROL_DIESEL";

                return (
                  <Card
                    key={exp.id}
                    className={`overflow-hidden border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 transition-all shadow-xs ${
                      isFuel ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-rose-500"
                    }`}
                  >
                    <div className="p-4 flex flex-col justify-between h-full space-y-3">
                      <div>
                        {/* Header: Category and Method */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                            {getCategoryLabel(exp.category)}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {exp.paymentMethod || "CASH"}
                          </Badge>
                        </div>

                        {/* Title & Amount */}
                        <div className="mt-2 flex items-baseline justify-between">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {exp.title}
                          </h4>
                          <span className="text-xl font-black text-rose-600 dark:text-rose-400 ml-2">
                            {formatCurrency(exp.amount)}
                          </span>
                        </div>

                        {/* Fuel Specific Info */}
                        {isFuel && (
                          <div className="mt-2 p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs flex items-center justify-between font-semibold text-amber-900 dark:text-amber-200">
                            <span>
                              {exp.fuelLitersOrKg ? `${exp.fuelLitersOrKg} ${isTe ? "కిలోలు" : "Kg / L"}` : isTe ? "గ్యాస్ ఫిల్లింగ్" : "Fuel filled"}
                            </span>
                            {exp.meterReadingKm && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Gauge size={12} /> {exp.meterReadingKm} KM
                              </span>
                            )}
                          </div>
                        )}

                        {exp.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic">
                            &ldquo;{exp.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleOpenEditExpense(exp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
                        >
                          <Edit3 size={13} />
                          <span>{isTe ? "సవరించు" : "Edit"}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
                        >
                          <Trash2 size={13} />
                          <span>{isTe ? "తొలగించు" : "Delete"}</span>
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 3: DAILY SUMMARY & MILEAGE HISTORY */}
      {activeTab === "daily_logs" && (
        <div className="space-y-4">
          {/* Today's Mileage & KM Spotlight Card */}
          <Card className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Gauge size={20} className="text-amber-400" />
                  <h3 className="text-base font-black">
                    {isTe ? "నేటి ప్రయాణం & మైలేజ్ విశ్లేషణ" : "Today's Running & Mileage Analytics"}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDate(selectedDate)}
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setShowMeterModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs"
              >
                {isTe ? "మీటర్ రీడింగ్ అప్‌డేట్ చేయండి" : "Update Meter Readings"}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  {isTe ? "ఉదయం ప్రారంభ మీటర్" : "Start Meter"}
                </span>
                <span className="text-lg font-black text-slate-200">
                  {dailyLog?.startMeterKm ? `${dailyLog.startMeterKm} KM` : "--"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  {isTe ? "రాత్రి ముగింపు మీటర్" : "End Meter"}
                </span>
                <span className="text-lg font-black text-slate-200">
                  {dailyLog?.endMeterKm ? `${dailyLog.endMeterKm} KM` : "--"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-amber-400 uppercase font-bold block">
                  {isTe ? "నేటి మొత్తం తిరిగిన KM" : "Total KM Driven"}
                </span>
                <span className="text-xl font-black text-amber-400">
                  {totalKmRun ? `${totalKmRun} KM` : "--"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                  {isTe ? "గ్యాస్ మైలేజ్ (KM / Kg)" : "CNG Mileage"}
                </span>
                <span className="text-xl font-black text-emerald-400">
                  {mileageKmPerUnit ? `${mileageKmPerUnit} KM/Kg` : "--"}
                </span>
              </div>
            </div>
          </Card>

          {/* Past 30 Days History Table */}
          <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold">
                {isTe ? "గత రోజుల సంపాదన & నికర లాభాల చరిత్ర" : "Past Days Performance & Net Profit History"}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{isTe ? "తేదీ" : "Date"}</th>
                    <th className="py-3 px-4 text-center">{isTe ? "రైడ్లు" : "Rides"}</th>
                    <th className="py-3 px-4 text-center">{isTe ? "తిరిగిన KM" : "KM Run"}</th>
                    <th className="py-3 px-4 text-right">{isTe ? "మొత్తం సంపాదన" : "Gross Income"}</th>
                    <th className="py-3 px-4 text-right">{isTe ? "ఇంధనం (గ్యాస్)" : "Fuel Cost"}</th>
                    <th className="py-3 px-4 text-right">{isTe ? "ఇతర ఖర్చులు" : "Other Exp."}</th>
                    <th className="py-3 px-4 text-right text-emerald-600 font-bold">{isTe ? "నికర లాభం (Profit)" : "Net Profit"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allDailyLogs.map((log) => {
                    const isToday = log.date.split("T")[0] === selectedDate;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedDate(log.date.split("T")[0])}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isToday ? "bg-amber-50/60 dark:bg-amber-950/20 font-bold" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{formatDate(log.date)}</span>
                          {isToday && (
                            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-black">
                              {isTe ? "ఎంపికైనది" : "Selected"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">
                          {log.totalRidesCount}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                          {log.totalKm ? `${log.totalKm} KM` : "--"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(log.totalEarnings)}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-700 dark:text-amber-400 font-semibold">
                          {formatCurrency(log.totalFuelCost)}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                          {formatCurrency(log.totalOtherExpenses)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(log.netProfit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 8. MODAL: ADD / EDIT RIDE */}
      {showAddRideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Car size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingRide
                    ? isTe ? "రైడ్ వివరాలను సవరించండి" : "Edit Auto Ride"
                    : isTe ? "కొత్త ఆటో రైడ్ నమోదు" : "Add Auto Ride"}
                </h3>
              </div>
              <button
                onClick={() => setShowAddRideModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRide} className="space-y-3.5 text-xs">
              {/* Fare Amount */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "కిరాయి మొత్తం (Fare ₹) *" : "Fare Amount (₹) *"}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 150"
                  value={fareAmount}
                  onChange={(e) => setFareAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-base"
                />
              </div>

              {/* Payment Method & Ride Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "చెల్లింపు విధానం" : "Payment Method"}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="CASH">{isTe ? "నగదు (Cash)" : "Cash in Hand"}</option>
                    <option value="UPI">PhonePe / GPay / Paytm (UPI)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "రైడ్ రకం" : "Ride Type"}
                  </label>
                  <select
                    value={rideType}
                    onChange={(e) => setRideType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="LOCAL">{isTe ? "లోకల్ సవారీ" : "Local Ride"}</option>
                    <option value="HIRE">{isTe ? "బుకింగ్ / స్పెషల్ హైర్" : "Special Hire"}</option>
                    <option value="SHARING">{isTe ? "షేరింగ్ ఆటో" : "Sharing Ride"}</option>
                    <option value="OUTSTATION">{isTe ? "దూర ప్రయాణం / ఔట్‌స్టేషన్" : "Outstation"}</option>
                  </select>
                </div>
              </div>

              {/* Pickup & Drop */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "ఎక్కడి నుండి" : "Pickup Location"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bus Stand"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "ఎక్కడికి" : "Drop Location"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Railway Station"
                    value={dropLocation}
                    onChange={(e) => setDropLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Date & Distance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "తేదీ *" : "Ride Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "దూరం (KM)" : "Distance (KM)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5.5"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "గమనికలు" : "Notes / Remarks"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regular passenger hire"
                  value={rideNotes}
                  onChange={(e) => setRideNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRideModal(false)}
                >
                  {isTe ? "రద్దు" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingRide}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {savingRide
                    ? isTe ? "సేవ్ అవుతోంది..." : "Saving..."
                    : isTe ? "భద్రపరచండి" : "Save Ride"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: ADD / EDIT EXPENSE & FUEL */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <Fuel size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingExpense
                    ? isTe ? "ఆటో ఖర్చును సవరించండి" : "Edit Auto Expense"
                    : isTe ? "ఆటో ఖర్చు / గ్యాస్ నమోదు" : "Add Auto Expense / Fuel"}
                </h3>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "ఖర్చు రకం / కేటగిరీ *" : "Expense Category *"}
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="CNG_GAS">{isTe ? "గ్యాస్ (CNG Gas)" : "CNG Gas"}</option>
                  <option value="PETROL_DIESEL">{isTe ? "పెట్రోల్ / డీజిల్" : "Petrol / Diesel"}</option>
                  <option value="OIL_GREASE">{isTe ? "2T ఆయిల్ & గ్రీస్" : "2T Oil & Grease"}</option>
                  <option value="TYRE_PUNCTURE">{isTe ? "టైర్ / పంచర్" : "Tyre & Puncture"}</option>
                  <option value="AUTO_WASH">{isTe ? "వాషింగ్ & క్లీనింగ్" : "Auto Wash & Cleaning"}</option>
                  <option value="MAINTENANCE">{isTe ? "సర్వీసింగ్ & రిపేర్లు" : "Repairs & Maintenance"}</option>
                  <option value="STAND_UNION_FEE">{isTe ? "స్టాండ్ / యూనియన్ ఫీజు" : "Stand / Union Fee"}</option>
                  <option value="CHALLAN_FINE">{isTe ? "ట్రాఫిక్ చలానా / ఫైన్" : "Traffic Challan / Fine"}</option>
                  <option value="AUTO_EMI">{isTe ? "ఆటో EMI / లోన్" : "Auto EMI / Loan"}</option>
                  <option value="INSURANCE_PERMIT">{isTe ? "ఇన్సూరెన్స్ & పర్మిట్" : "Insurance & Permit"}</option>
                  <option value="OTHER">{isTe ? "ఇతర ఖర్చు" : "Other Expense"}</option>
                </select>
              </div>

              {/* Title & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "వివరాలు / శీర్షిక" : "Title / Name"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Morning CNG, Front Tyre"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "మొత్తం (₹) *" : "Amount (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 350"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm"
                  />
                </div>
              </div>

              {/* Fuel Quantity & Meter reading (Only for fuel/CNG) */}
              {(expenseCategory === "CNG_GAS" || expenseCategory === "PETROL_DIESEL") && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <div>
                    <label className="block font-bold text-amber-900 dark:text-amber-200 mb-1">
                      {isTe ? "పరిమాణం (Kg / Liters)" : "Quantity (Kg / Liters)"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 3.5"
                      value={fuelQuantity}
                      onChange={(e) => setFuelQuantity(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-900 dark:text-amber-200 mb-1">
                      {isTe ? "మీటర్ రీడింగ్ (KM)" : "Odometer (KM)"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 45280"
                      value={expenseMeterKm}
                      onChange={(e) => setExpenseMeterKm(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "ఖర్చు చేసిన తేదీ *" : "Expense Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "చెల్లింపు విధానం" : "Payment Method"}
                  </label>
                  <select
                    value={expensePayMethod}
                    onChange={(e) => setExpensePayMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="CASH">{isTe ? "నగదు (Cash)" : "Cash"}</option>
                    <option value="UPI">UPI / PhonePe / GPay</option>
                    <option value="BANK_TRANSFER">{isTe ? "బ్యాంక్" : "Bank"}</option>
                  </select>
                </div>
              </div>

              {/* Deduct from account option */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductFromAccount}
                    onChange={(e) => setDeductFromAccount(e.target.checked)}
                    className="rounded text-rose-600"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {isTe ? "నా ఖాతా బ్యాలెన్స్ నుండి తీసివేయండి" : "Deduct from my Account balance"}
                  </span>
                </label>

                {deductFromAccount && (
                  <select
                    value={expenseAccountId}
                    onChange={(e) => setExpenseAccountId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "గమనికలు" : "Notes"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Indian Oil CNG Station"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddExpenseModal(false)}
                >
                  {isTe ? "రద్దు" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingExpense}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {savingExpense
                    ? isTe ? "సేవ్ అవుతోంది..." : "Saving..."
                    : isTe ? "ఖర్చు భద్రపరచండి" : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. MODAL: UPDATE METER READINGS (Morning & Night Odometer) */}
      {showMeterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Gauge size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isTe ? "మీటర్ రీడింగ్ నమోదు" : "Update Daily Meter (KM)"}
                </h3>
              </div>
              <button
                onClick={() => setShowMeterModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeter} className="space-y-3.5 text-xs">
              <p className="text-slate-500 text-[11px]">
                {isTe
                  ? "ఉదయం ప్రారంభ మీటర్ మరియు రాత్రి ముగింపు మీటర్ రీడింగ్‌లు నమోదు చేస్తే మొత్తం తిరిగిన KM మరియు మైలేజ్ ఆటోమేటిక్‌గా లెక్కించబడతాయి."
                  : "Enter morning starting and night closing odometer readings to auto-calculate daily running distance and fuel mileage."}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "ఉదయం మీటర్ (Start KM)" : "Start Meter (KM)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 45200"
                    value={startMeter}
                    onChange={(e) => setStartMeter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isTe ? "రాత్రి మీటర్ (End KM)" : "End Meter (KM)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 45310"
                    value={endMeter}
                    onChange={(e) => setEndMeter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-sm"
                  />
                </div>
              </div>

              {/* Real-time KM Preview */}
              {parseFloat(startMeter) > 0 && parseFloat(endMeter) >= parseFloat(startMeter) && (
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 text-indigo-900 dark:text-indigo-200 font-bold flex justify-between items-center">
                  <span>{isTe ? "ఈరోజు మొత్తం ప్రయాణం:" : "Total Running Distance:"}</span>
                  <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
                    {parseFloat(endMeter) - parseFloat(startMeter)} KM
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "గమనికలు" : "Notes"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Heavy traffic on bypass road"
                  value={meterNotes}
                  onChange={(e) => setMeterNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMeterModal(false)}
                >
                  {isTe ? "రద్దు" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingMeter}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {savingMeter
                    ? isTe ? "సేవ్ అవుతోంది..." : "Saving..."
                    : isTe ? "మీటర్ సేవ్ చేయండి" : "Save Meter"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODAL: DEPOSIT NET PROFIT TO ACCOUNT */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Wallet size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isTe ? "నికర లాభాన్ని ఖాతాలో జమ చేయండి" : "Deposit Net Profit into Account"}
                </h3>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositEarnings} className="space-y-3.5 text-xs">
              <p className="text-slate-500 text-[11px]">
                {isTe
                  ? "నేటి నికర లాభాన్ని మీ క్యాష్ లేదా బ్యాంక్ ఖాతాలో జమ చేస్తే, అది వెంటనే డాష్‌బోర్డ్ మరియు స్వీకరించిన నగదు (Received Money) లో అప్‌డేట్ అవుతుంది."
                  : "Depositing your net daily earnings transfers the profit directly into your Cash/Bank balance and records it in Received Money."}
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "జమ చేయవలసిన లాభం మొత్తం (₹) *" : "Deposit Amount (₹) *"}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-base text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "జమ చేయవలసిన ఖాతా *" : "Deposit Into Account *"}
                </label>
                <select
                  required
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "చెల్లింపు విధానం" : "Payment Method"}
                </label>
                <select
                  value={depositPayMethod}
                  onChange={(e) => setDepositPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="CASH">{isTe ? "చేతిలో నగదు (Cash in Hand)" : "Cash in Hand"}</option>
                  <option value="UPI">PhonePe / GPay / UPI</option>
                  <option value="BANK_TRANSFER">{isTe ? "బ్యాంక్ డిపాజిట్" : "Bank Transfer"}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTe ? "గమనికలు" : "Notes"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily auto net earnings deposit"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDepositModal(false)}
                >
                  {isTe ? "రద్దు" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingDeposit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {savingDeposit
                    ? isTe ? "జమ అవుతోంది..." : "Depositing..."
                    : isTe ? "ఖాతాలో జమ చేయండి" : "Confirm Deposit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
