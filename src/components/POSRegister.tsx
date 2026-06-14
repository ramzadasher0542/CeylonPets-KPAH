/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mutate } from 'swr';
import { 
  ShoppingBag, Search, Tag, Trash2, Plus, Minus, UserPlus, 
  CreditCard, Coins, QrCode, FileText, Check, AlertTriangle, 
  ChevronDown, Sparkles, Printer, Wallet, Activity, ArrowRight
} from 'lucide-react';
import { 
  InventoryItem, Appointment, Invoice, InvoiceItem, PaymentMethod, 
  User as StaffUser, MedicalRecord, Shift 
} from '../types';
import { showToast } from './Toast';
import { fetchActiveShiftId, openShift, closeShift, fetchActiveShiftDetails, addRevenueToActiveShift } from '../lib/db';
import { formatDisplayDate } from '../utils/time';

interface POSProps {
  inventory: InventoryItem[];
  appointments: Appointment[];
  records: MedicalRecord[];
  isOnline: boolean;
  currentUser: StaffUser;
  invoices: Invoice[];
  onUpdateStock: (itemId: string, qtyDelta: number, expectedStock?: number) => Promise<void>;
  onAddInvoice: (invoice: Invoice) => Promise<void>;
  onVoidInvoice: (invoiceId: string) => void;
  systemConfig?: any;
  onVerifyMasterPin?: (pin: string) => boolean;
  onTriggerInventorySync?: () => void;
  incomingClient?: { phone: string; name: string; id: string } | null;
}

interface ActiveClient {
  id: string;
  name: string;
  phone: string;
  petName?: string;
  appointmentId?: string;
}

export default function POSRegister({ 
  inventory, appointments, records, isOnline, currentUser, invoices,
  onUpdateStock, onAddInvoice, onVoidInvoice, systemConfig,
  onVerifyMasterPin, onTriggerInventorySync, incomingClient
}: POSProps) {
  
  // Enterprise Split POS States
  const [activeTab, setActiveTab] = useState<'queue' | 'quick' | 'search' | 'ledger'>('queue');
  const [isWalkIn, setIsWalkIn] = useState(!incomingClient);
  const [selectedClient, setSelectedClient] = useState<ActiveClient | null>(
    incomingClient ? { id: incomingClient.id, name: incomingClient.name, phone: incomingClient.phone } : null
  );

  const [cart, setCart] = useState<Array<{ item: InventoryItem; quantity: number }>>([]);
  const [discountVal, setDiscountVal] = useState<number>(0);
  
  // Search & Inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | 'paid' | 'void'>('all');
  
  // Checkout & Modals
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState<Invoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<Invoice | null>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Auth Overlay
  const [showPinChallenge, setShowPinChallenge] = useState(false);
  const [challengeInvoiceId, setChallengeInvoiceId] = useState<string | null>(null);
  const [enteredChallengePin, setEnteredChallengePin] = useState('');
  const [challengePinError, setChallengePinError] = useState(false);

  // Shift Ledger States
  const [openingFloatInput, setOpeningFloatInput] = useState('');
  const [showCashDrawerModal, setShowCashDrawerModal] = useState(false);
  const [currentActiveShift, setCurrentActiveShift] = useState<Shift | null>(null);
  const [actualCashInput, setActualCashInput] = useState('');
  const [closeNotesInput, setCloseNotesInput] = useState('');
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showDrawerBalancePopup, setShowDrawerBalancePopup] = useState(false);

  // 1. Context Lifecycle Hooks
  useEffect(() => {
    if (incomingClient) {
      setIsWalkIn(false);
      setSelectedClient({ id: incomingClient.id, name: incomingClient.name, phone: incomingClient.phone });
    }
  }, [incomingClient]);

  useEffect(() => {
    if (isWalkIn) {
      setSelectedClient({ id: 'walk_in_retail', name: 'Walk-In / Retail Customer', phone: '0000000000' });
    } else if (selectedClient?.id === 'walk_in_retail') {
      setSelectedClient(null);
    }
  }, [isWalkIn]);

  const fetchAndHydrateShiftContext = async () => {
    try {
      const shiftDetails = await fetchActiveShiftDetails();
      setCurrentActiveShift(shiftDetails);
    } catch (err) {
      console.error('[CeylonPets POS] Failed to fetch active shift context.', err);
    }
  };

  const mutateShift = async () => {
    await fetchAndHydrateShiftContext();
    mutate('shift_metrics');
    mutate('activeShiftId');
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchAndHydrateShiftContext();
    return () => { isMounted = false; };
  }, []);

  // Keyboard escape listeners
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCheckoutModal(false);
        setShowCashDrawerModal(false);
        if (checkoutSuccess) setCheckoutSuccess(null);
      }
      if (checkoutSuccess && e.key === 'Enter') {
        e.preventDefault();
        handlePrintReceipt(checkoutSuccess);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showCheckoutModal, showCashDrawerModal, checkoutSuccess]);

  const getLiveDrawerBalances = () => {
    if (!currentActiveShift) {
      return {
        cashBalance: 0,
        cardBalance: 0,
        bankTransferBalance: 0,
        openingFloat: 0
      };
    }

    const activeInvoices = invoices.filter(
      inv => inv.shiftId === currentActiveShift.id && inv.paymentStatus === 'paid'
    );

    let cashSales = 0;
    let cardSales = 0;
    let bankTransferSales = 0;

    activeInvoices.forEach(inv => {
      const totalCents = Math.round(inv.sales_total * 100);
      if (inv.paymentMethod === 'cash') {
        cashSales += totalCents;
      } else if (inv.paymentMethod === 'card') {
        cardSales += totalCents;
      } else if (inv.paymentMethod === 'bank_transfer') {
        bankTransferSales += totalCents;
      }
    });

    const openingFloat = currentActiveShift.openingFloatCents || 0;
    const expenses = 0; // default to 0 for now
    const cashBalance = openingFloat + cashSales - expenses;

    return {
      cashBalance,
      cardBalance: cardSales,
      bankTransferBalance: bankTransferSales,
      openingFloat
    };
  };

  // 2. Routing Helpers (Queue to Cart)
  const normalizePhone = (p: string) => p.replace(/\D/g, '');

  const handleQueueClick = (apt: Appointment) => {
    setIsWalkIn(false);
    
    // Find associated medical record using petName and ownerPhone to safely pull prescriptions
    const matchedRec = records.find(r => 
      r.petName === apt.petName && 
      normalizePhone(r.ownerPhone) === normalizePhone(apt.ownerPhone)
    );

    setSelectedClient({
      id: matchedRec?.patientId || apt.id,
      name: apt.ownerName,
      phone: apt.ownerPhone,
      petName: apt.petName,
      appointmentId: apt.id
    });

    // Automatically push prescribed meds to the cart
    if (matchedRec && matchedRec.prescribedMeds) {
      matchedRec.prescribedMeds.forEach(med => {
        const invItem = inventory.find(i => i.id === med.itemId);
        if (invItem) addToCart(invItem, med.quantity || 1);
      });
    }

    // Automatically push standard consultation fee
    const consultFee = inventory.find(i => i.category === 'service' && i.name.toLowerCase().includes('consult'));
    if (consultFee) {
      addToCart(consultFee, 1);
    } else {
      const anyService = inventory.find(i => i.category === 'service');
      if (anyService) addToCart(anyService, 1);
    }
    
    showToast(`Session locked to ${apt.petName}. Prescriptions injected to cart.`, 'success');
  };

  // 3. Cart & Inventory Functions
  const addToCart = (product: InventoryItem, qty: number = 1) => {
    const isService = product?.category === 'service' || product?.category === 'lab_service';
    if (product.stock <= 0 && !isService) {
      showToast(`Critical: ${product.name} is out of stock.`, 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.item.id === product.id);
      if (existing) {
        if (existing.quantity + qty > product.stock && !isService) {
           showToast(`Cannot add more. Inventory limit reached.`, 'error');
           return prev;
        }
        return prev.map(i => i.item.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { item: product, quantity: qty }];
    });
  };

  const updateCartQty = (productId: string, val: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === productId) {
        const newQty = i.quantity + val;
        const isService = i.item.category === 'service' || i.item.category === 'lab_service';
        if (newQty <= 0) return { ...i, quantity: 0 }; // Will be filtered out
        if (newQty > i.item.stock && !isService) {
          showToast(`Cannot exceed available stock limit.`, 'error');
          return i;
        }
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (productId: string) => setCart(cart.filter(i => i.item.id !== productId));

  const handleResetActiveRegisterCartAtomic = useCallback(() => {
    setCart([]);
    setDiscountVal(0);
    setIsWalkIn(true);
    setAmountReceived('');
  }, []);

  const handleBarcodeSubmit = (skuText: string) => {
    const trimmedSku = skuText.trim();
    if (!trimmedSku) return;
    const found = inventory.find(i => i.sku.toLowerCase() === trimmedSku.toLowerCase() || i.id.toLowerCase() === trimmedSku.toLowerCase());
    if (found) {
      addToCart(found, 1);
      setBarcodeFeedback({ text: `Instantly added: ${found.name}`, error: false });
      setBarcodeInput('');
    } else {
      setBarcodeFeedback({ text: `SKU "${trimmedSku}" not found.`, error: true });
    }
    setTimeout(() => setBarcodeFeedback(null), 4000);
  };

  // 4. Pure Integer-Math Preservation
  const taxRate = systemConfig ? systemConfig.taxRate : 0.0825;
  const currencySign = systemConfig ? systemConfig.currencySymbol : 'Rs.';
  
  const centsSubtotal = cart.reduce((sum, item) => sum + Math.round(item.item.price * 100) * item.quantity, 0);
  const centsDiscount = Math.round((discountVal || 0) * 100);
  
  const netCentsSubtotal = Math.max(0, centsSubtotal - centsDiscount);
  const centsTax = Math.round(netCentsSubtotal * taxRate);
  const centsTotal = netCentsSubtotal + centsTax;

  const subtotal = centsSubtotal / 100;
  const discount = centsDiscount / 100;
  const tax = centsTax / 100;
  const total = centsTotal / 100;

  // 5. Hardened Checkout Hook (With Relational Patient Linkage)
  const handleCheckoutSubmit = async (): Promise<boolean> => {
    if (isProcessing) return false;
    if (cart.length === 0) {
      showToast('Cannot checkout: Cart is empty.', 'error');
      return false;
    }
    setIsProcessing(true);

    try {
      const activeShiftId = await fetchActiveShiftId();
      if (!activeShiftId) {
        showToast('Cannot checkout: No open shift detected.', 'error');
        setIsProcessing(false);
        return false;
      }

      let totalCogsCents = 0;
      const newInvItems: InvoiceItem[] = cart.map(c => {
        const itemCostCents = Math.round((Number(c.item.cost) || 0) * 100);
        totalCogsCents += itemCostCents * c.quantity;
        return {
          itemId: c.item.id,
          sku: c.item.sku,
          name: c.item.name,
          category: c.item.category,
          quantity: c.quantity,
          unitPrice: c.item.price,
          totalPrice: (Math.round(c.item.price * 100) * c.quantity) / 100
        };
      });

      const totalCogs = totalCogsCents / 100;
      const profit = Math.round((total - totalCogs) * 100) / 100;

      // Integrate Clinical Queue Hook Context securely
      let finalAppointmentId = selectedClient?.appointmentId || undefined;
      let finalPatientId = selectedClient?.id || '0';
      let finalPetName = selectedClient?.petName || 'Walk-in Pet / Guest';
      let finalOwnerName = selectedClient?.name || 'Walk-In / Retail Customer';
      let finalOwnerPhone = selectedClient?.phone || '0000000000';
      let notes = 'POS Quick Checkout';
      if (finalAppointmentId) notes = `Clinical checkout for appointment: ${finalAppointmentId}`;

      const invoiceObj: Invoice = {
        id: String(Math.floor(Date.now() / 1000)),
        appointmentId: finalAppointmentId,
        patientId: finalPatientId,
        petName: finalPetName,
        ownerName: finalOwnerName,
        ownerPhone: finalOwnerPhone,
        date: new Date().toISOString().split('T')[0],
        items: newInvItems,
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        sales_total: total,
        cogs: totalCogs,
        profit: profit,
        shiftId: activeShiftId,
        paymentMethod: paymentMethod,
        paymentStatus: 'paid',
        createdBy: currentUser?.name || 'Unknown',
        notes: notes
      };

      const stockPromises = cart
        .filter(c => c.item.category !== 'service' && c.item.category !== 'lab_service')
        .map(c => onUpdateStock(c.item.id, -c.quantity, c.item.stock));

      await Promise.all([...stockPromises, onAddInvoice(invoiceObj)]);
      await addRevenueToActiveShift(paymentMethod, Math.round(total * 100));

      setCheckoutSuccess(invoiceObj);
      handleResetActiveRegisterCartAtomic();
      setShowCheckoutModal(false);
      setIsProcessing(false);
      showToast('Checkout complete! Invoice generated.', 'success');
      return true;

    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast('Database error during checkout. Cart preserved.', 'error');
      setIsProcessing(false);
      return false;
    }
  };

  // Security / System Operations (Voiding, Printing, Z-Reports)
  const hashPin = (pin: string) => {
    if (!pin || /^\d{4}$/.test(pin) === false) return pin;
    let hash = 5381;
    const combined = pin + "CeylonPetsSecuritySalt";
    for (let i = 0; i < combined.length; i++) hash = (hash * 33) ^ combined.charCodeAt(i);
    return (hash >>> 0).toString(16).padStart(8, '0');
  };

  const handleInitiateVoid = (invId: string) => {
    if (currentUser.role === 'owner' || currentUser.role === 'admin') {
      if (window.confirm(`Void Invoice ${invId}? Stock will be reinstated.`)) {
        onVoidInvoice(invId);
        setSelectedInvoiceDetails(prev => prev && prev.id === invId ? { ...prev, paymentStatus: 'void' } : prev);
      }
    } else {
      setChallengeInvoiceId(invId);
      setShowPinChallenge(true);
    }
  };

  const handleVerifyChallengePin = () => {
    const authorized = onVerifyMasterPin 
      ? onVerifyMasterPin(enteredChallengePin)
      : hashPin(enteredChallengePin) === (systemConfig?.masterPin || hashPin('5692'));
    if (authorized && challengeInvoiceId) {
      onVoidInvoice(challengeInvoiceId);
      setSelectedInvoiceDetails(prev => prev && prev.id === challengeInvoiceId ? { ...prev, paymentStatus: 'void' } : prev);
      setShowPinChallenge(false);
      setChallengeInvoiceId(null);
      setEnteredChallengePin('');
      showToast(`Transaction voided successfully.`, 'success');
    } else {
      setChallengePinError(true);
      setEnteredChallengePin('');
      setTimeout(() => setChallengePinError(false), 2000);
    }
  };

  const handlePrintReceipt = (inv: Invoice) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return;
    const html = `<html><head><style>body{font-family:monospace;font-size:12px;}</style></head><body>
      <h3>${systemConfig?.hospitalName || 'Ceylon Pets'}</h3>
      <p>Invoice: ${inv.id}<br/>Total: ${currencySign}${inv.sales_total.toFixed(2)}</p>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}</script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleOpenShift = async () => {
    if (isProcessing || !openingFloatInput) return;
    setIsProcessing(true);
    try {
      const floatCents = Math.round(parseFloat(openingFloatInput) * 100);
      const shiftId = await openShift(currentUser?.name || 'Staff', floatCents);
      if (shiftId) {
        showToast('Shift session established.', 'success');
        setOpeningFloatInput('');
        await fetchAndHydrateShiftContext();
      }
    } catch (err) {
      showToast('Could not initialize shift.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getZReportCalculations = () => {
    if (!currentActiveShift) return { openingFloat: 0, expectedClosingCash: 0, netProfit: 0, cogs: 0, grossRevenue: 0, cashCollected: 0, cardCollected: 0, bankTransferCollected: 0, petSuppliesShop: 0, pharmacyRx: 0, labsServices: 0, clinicalCare: 0, vaccinations: 0 };
    const shiftInvoices = invoices.filter(inv => inv.shiftId === currentActiveShift.id && inv.paymentStatus === 'paid');
    let [cash, card, bank, gross, cogsAmount] = [0, 0, 0, 0, 0];
    shiftInvoices.forEach(inv => {
      const t = Math.round(inv.sales_total * 100);
      if (inv.paymentMethod === 'cash') cash += t;
      if (inv.paymentMethod === 'card') card += t;
      if (inv.paymentMethod === 'bank_transfer') bank += t;
      gross += t;
      cogsAmount += Math.round((inv.cogs || 0) * 100);
    });
    return {
      openingFloat: currentActiveShift.openingFloatCents || 0,
      expectedClosingCash: (currentActiveShift.openingFloatCents || 0) + cash,
      cashCollected: cash, cardCollected: card, bankTransferCollected: bank,
      grossRevenue: gross, cogs: cogsAmount, netProfit: gross - cogsAmount,
      petSuppliesShop: 0, pharmacyRx: 0, labsServices: 0, clinicalCare: 0, vaccinations: 0
    };
  };

  const handleCompileAndCloseShiftZReport = async (
    actualCountedCashInput: string,
    staffNotes: string
  ) => {
    if (!currentActiveShift) return;

    try {
      const zCalculations = getZReportCalculations();
      
      const openedFloat = zCalculations.openingFloat;
      const cashRev = zCalculations.cashCollected;
      const cardRev = zCalculations.cardCollected;
      const bankRev = zCalculations.bankTransferCollected;
      const expectedCashTotal = zCalculations.expectedClosingCash;
      const actualCountedCashCents = Math.round((parseFloat(actualCountedCashInput) || 0) * 100);
      const shiftDiscrepancyCents = actualCountedCashCents - expectedCashTotal;
      const grandTotalCollectedCents = zCalculations.grossRevenue;

      // Compile Z-Report text output dynamically for physical ticket presentation
      let zReportBuffer = `========================================\n`;
      zReportBuffer += `        CEYLON PETS ANIMAL HOSPITAL     \n`;
      zReportBuffer += `          OFFICIAL DAILY Z-REPORT       \n`;
      zReportBuffer += `========================================\n`;
      zReportBuffer += `Shift ID   : ${currentActiveShift.id}\n`;
      zReportBuffer += `Opened By  : ${currentActiveShift.openedBy}\n`;
      zReportBuffer += `Timestamp  : ${new Date().toLocaleString()}\n`;
      zReportBuffer += `----------------------------------------\n\n`;
      
      zReportBuffer += `BLOCK 1: FLOAT RECONCILIATION\n`;
      zReportBuffer += `- Opening Cash Float : Rs. ${(openedFloat / 100).toFixed(2)}\n`;
      zReportBuffer += `- Expected Closing   : Rs. ${(expectedCashTotal / 100).toFixed(2)}\n`;
      zReportBuffer += `- Actual Counted     : Rs. ${(actualCountedCashCents / 100).toFixed(2)}\n`;
      zReportBuffer += `- Shift Discrepancy  : Rs. ${(shiftDiscrepancyCents / 100).toFixed(2)}\n`;
      zReportBuffer += `- Reconciliation Note: ${staffNotes || 'None'} \n\n`;

      zReportBuffer += `BLOCK 2: PAYMENT METHODS BALANCE\n`;
      zReportBuffer += `- Cash Receipts      : Rs. ${(cashRev / 100).toFixed(2)}\n`;
      zReportBuffer += `- Card Receipts      : Rs. ${(cardRev / 100).toFixed(2)}\n`;
      zReportBuffer += `- Bank Transfer      : Rs. ${(bankRev / 100).toFixed(2)}\n`;
      zReportBuffer += `- Total Collected    : Rs. ${(grandTotalCollectedCents / 100).toFixed(2)}\n\n`;

      zReportBuffer += `BLOCK 3: PERFORMANCE BY CATEGORY\n`;
      zReportBuffer += `- Pet Supplies Shop  : Rs. ${(zCalculations.petSuppliesShop / 100).toFixed(2)}\n`;
      zReportBuffer += `- Pharmacy Rx        : Rs. ${(zCalculations.pharmacyRx / 100).toFixed(2)}\n`;
      zReportBuffer += `- Labs services      : Rs. ${(zCalculations.labsServices / 100).toFixed(2)}\n`;
      zReportBuffer += `- Clinical Care (srv): Rs. ${(zCalculations.clinicalCare / 100).toFixed(2)}\n`;
      zReportBuffer += `- Vaccinations       : Rs. ${(zCalculations.vaccinations / 100).toFixed(2)}\n\n`;

      zReportBuffer += `BLOCK 4: BOTTOM LINE\n`;
      zReportBuffer += `- Gross Revenue      : Rs. ${(grandTotalCollectedCents / 100).toFixed(2)}\n`;
      zReportBuffer += `- Cost of Goods Sold : Rs. ${(zCalculations.cogs / 100).toFixed(2)}\n`;
      zReportBuffer += `- Net Profit         : Rs. ${(zCalculations.netProfit / 100).toFixed(2)}\n\n`;
      
      zReportBuffer += `========================================\n`;
      zReportBuffer += `         END OF TERMINAL SUMMARY        \n`;
      zReportBuffer += `========================================\n`;

      console.log('[CeylonPets POS] Dispatching print payload buffer:\n', zReportBuffer);
      
      // Fire synchronous print sequence
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<pre style="font-family:monospace; font-size:12px; padding:20px;">${zReportBuffer}</pre>`);
        printWindow.document.close();
        printWindow.print();
      }

      // Finalize database persistent mutations
      await closeShift(
        currentActiveShift.id,
        actualCountedCashCents,
        expectedCashTotal,
        shiftDiscrepancyCents,
        staffNotes
      );

      await mutateShift();
      showToast('Shift closed cleanly and Z-Report dispatched to spooler.', 'success');
    } catch (err) {
      console.error('[CeylonPets POS] Encountered error compiling daily metrics:', err);
      showToast('Reconciliation transaction aborted due to execution crash.', 'error');
    }
  };

  // Filter Variables for Tabs
  const queueApts = appointments.filter(a => a.status === 'completed');
  const quickAddItems = inventory.filter(i => ['retail', 'vaccine', 'prescription'].includes(i.category)).slice(0, 12);
  const filteredProducts = inventory.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.sku.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-140px)] w-full gap-5 overflow-hidden" id="pos-enterprise-split">
      
      {/* ============================================================================================== */}
      {/* LEFT PANE: 40% (THE REGISTER CART) */}
      {/* ============================================================================================== */}
      <div className="w-[40%] min-w-[380px] flex flex-col border border-slate-200 rounded-2xl bg-white shadow-sm shrink-0 overflow-hidden relative">
        
        {/* Register Identity Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-black text-slate-800 tracking-tight text-sm">Active Register</span>
            <label className="flex items-center cursor-pointer hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={isWalkIn} 
                onChange={(e) => setIsWalkIn(e.target.checked)} 
              />
              <div className={`w-8 h-4 bg-slate-200 rounded-full transition-colors relative ${isWalkIn ? 'bg-emerald-500' : ''}`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isWalkIn ? 'translate-x-4' : ''}`} />
              </div>
              <span className="ml-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide">Walk-In</span>
            </label>
          </div>
          
          {!isWalkIn && selectedClient && (
            <div className="flex justify-between items-center bg-indigo-50 border border-indigo-200 p-3 rounded-xl shadow-xs animate-fade-in">
              <div>
                <div className="text-xs font-black text-indigo-900 leading-tight">{selectedClient.name}</div>
                <div className="text-[10px] font-bold text-indigo-600 font-mono mt-0.5">{selectedClient.phone}</div>
                {selectedClient.petName && (
                  <div className="text-[10px] font-bold text-slate-600 mt-1 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-indigo-400" /> Patient: {selectedClient.petName}
                  </div>
                )}
              </div>
              <button onClick={() => setIsWalkIn(true)} className="w-6 h-6 flex items-center justify-center text-indigo-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors cursor-pointer font-bold">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Cart Item Mapping */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-white">
          {cart.map(c => (
            <div key={c.item.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors bg-slate-50/50">
              <div className="space-y-1 overflow-hidden pr-2">
                <div className="text-[9px] font-mono text-slate-400">{c.item.sku}</div>
                <div className="text-xs font-bold text-slate-800 truncate leading-none">{c.item.name}</div>
                <div className="text-[10px] font-black text-slate-500 font-mono">{currencySign}{c.item.price.toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
                  <button onClick={() => updateCartQty(c.item.id, -1)} className="p-1 hover:bg-slate-100 text-slate-500 rounded-md cursor-pointer"><Minus className="h-3 w-3" /></button>
                  <span className="w-5 text-center font-bold text-slate-800 font-mono text-xs">{c.quantity}</span>
                  <button onClick={() => updateCartQty(c.item.id, 1)} className="p-1 hover:bg-slate-100 text-slate-500 rounded-md cursor-pointer"><Plus className="h-3 w-3" /></button>
                </div>
                <button onClick={() => removeFromCart(c.item.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
              <ShoppingBag className="w-10 h-10 opacity-50" />
              <div className="text-xs font-bold">Register is Empty</div>
            </div>
          )}
        </div>

        {/* Footer Math & Checkout Payload */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 space-y-3">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-bold text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono text-slate-700">{currencySign}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-500 items-center">
              <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-indigo-400" /> Discount:</span>
              <input 
                type="number" min="0" step="5" 
                value={discountVal || ''} 
                onChange={e => setDiscountVal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-16 px-1.5 py-0.5 rounded-md border border-slate-200 text-right font-mono text-slate-700 font-bold outline-none focus:border-indigo-400"
              />
            </div>
            <div className="flex justify-between font-bold text-slate-500 border-b border-slate-200 pb-2">
              <span>Vet Tax ({(taxRate*100).toFixed(1)}%):</span>
              <span className="font-mono text-slate-700">{currencySign}{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center font-black text-slate-900 pt-1">
              <span className="text-sm">Total Due:</span>
              <span className="font-mono text-lg text-emerald-600">{currencySign}{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button 
              onClick={() => { setPaymentMethod('cash'); setShowCheckoutModal(true); }}
              disabled={cart.length === 0}
              className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-xl cursor-pointer shadow-md disabled:opacity-50 uppercase tracking-widest flex flex-col items-center justify-center gap-1"
            >
              <Coins className="w-4 h-4" /> Cash
            </button>
            <button 
              onClick={() => { setPaymentMethod('card'); setShowCheckoutModal(true); }}
              disabled={cart.length === 0}
              className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-xl cursor-pointer shadow-md disabled:opacity-50 uppercase tracking-widest flex flex-col items-center justify-center gap-1"
            >
              <CreditCard className="w-4 h-4" /> Card
            </button>
            <button 
              onClick={() => { setPaymentMethod('bank_transfer'); setShowCheckoutModal(true); }}
              disabled={cart.length === 0}
              className="py-3 bg-sky-600 hover:bg-sky-700 text-white font-black text-[10px] rounded-xl cursor-pointer shadow-md disabled:opacity-50 uppercase tracking-widest flex flex-col items-center justify-center gap-1"
            >
              <FileText className="w-4 h-4" /> Transfer
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================================================== */}
      {/* RIGHT PANE: 60% (ACTION TABS) */}
      {/* ============================================================================================== */}
      <div className="flex-1 flex flex-col border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden relative">
        
        {/* Tabs & Shift Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['queue', 'quick', 'search', 'ledger'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'queue' ? 'Queue' : tab === 'quick' ? 'Quick Add' : tab}
              </button>
            ))}
          </div>

          {currentActiveShift && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDrawerBalancePopup(!showDrawerBalancePopup)} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"><Wallet className="w-3 h-3" /> Drawer</button>
              <button onClick={() => setShowCloseShiftModal(true)} className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"><Check className="w-3 h-3" /> Z-Report</button>
            </div>
          )}
        </div>

        {/* Tab Body Renders */}
        <div className="flex-1 bg-slate-50 p-5 overflow-y-auto custom-scrollbar relative">
          
          {/* TAB 1: Billing Queue */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" /> Awaiting Clinical Checkout
              </h3>
              {queueApts.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-400 bg-white">No patients currently queued for checkout.</div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {queueApts.map(apt => (
                    <div key={apt.id} onClick={() => handleQueueClick(apt)} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-32 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-700 px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-lg">Pending</div>
                      <div>
                        <div className="text-sm font-black text-slate-800">{apt.petName}</div>
                        <div className="text-[10px] font-bold text-slate-500 mt-0.5">{apt.ownerName} • <span className="font-mono">{apt.ownerPhone}</span></div>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[10px]">
                        <span className="font-bold text-slate-600 flex items-center gap-1"><UserPlus className="w-3 h-3" /> {apt.veterinarian}</span>
                        <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-1">Process Bill <ArrowRight className="w-3 h-3" /></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Quick-Add Retail */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Frequent Items & Vaccines
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {quickAddItems.map(item => (
                  <button key={item.id} onClick={() => addToCart(item, 1)} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-sky-400 hover:shadow-md transition-all text-left flex flex-col justify-between h-28 cursor-pointer active:scale-95 group">
                    <span className="text-xs font-bold text-slate-800 line-clamp-3 leading-snug group-hover:text-sky-700">{item.name}</span>
                    <div className="flex justify-between items-center mt-2 w-full">
                      <span className="text-[11px] font-black text-emerald-600 font-mono">{currencySign}{item.price.toFixed(2)}</span>
                      <Plus className="w-4 h-4 text-slate-300 group-hover:text-sky-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Search All Inventory */}
          {activeTab === 'search' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex gap-3 shrink-0 relative">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search by name or SKU..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 shadow-sm outline-none" />
                </div>
                <div className="relative w-48 xl:w-64">
                  <QrCode className="absolute left-3.5 top-2.5 h-4 w-4 text-indigo-500" />
                  <input type="text" placeholder="Scan Barcode..." value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBarcodeSubmit(barcodeInput)} className="w-full pl-10 pr-10 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 shadow-sm outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => addToCart(product)} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between active:scale-95">
                      <div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 block w-max mb-1">{product.sku}</span>
                        <h5 className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2">{product.name}</h5>
                      </div>
                      <div className="mt-2 flex justify-between items-center border-t border-slate-100 pt-2">
                        <span className="text-xs font-black text-slate-800 font-mono">{currencySign}{product.price.toFixed(2)}</span>
                        <span className="text-[9px] font-bold text-slate-400">Stock: {product.stock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Past Ledger */}
          {activeTab === 'ledger' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search invoices by ID, name, or phone..." value={ledgerSearchQuery} onChange={e => setLedgerSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 shadow-sm outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {invoices.filter(i => ledgerStatusFilter === 'all' || i.paymentStatus === ledgerStatusFilter).map(inv => (
                  <div key={inv.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-xs text-slate-800">{inv.id}</div>
                      <div className="text-[10px] font-semibold text-slate-500 mt-0.5">{inv.ownerName} • {inv.date}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono font-black text-sm text-slate-800">{currencySign}{inv.sales_total.toFixed(2)}</div>
                        <div className={`text-[8px] font-extrabold uppercase mt-0.5 ${inv.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>{inv.paymentStatus}</div>
                      </div>
                      <div className="flex gap-1 border-l border-slate-100 pl-3">
                        <button onClick={() => setSelectedInvoiceDetails(inv)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg"><FileText className="w-4 h-4"/></button>
                        <button onClick={() => handlePrintReceipt(inv)} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"><Printer className="w-4 h-4"/></button>
                        {inv.paymentStatus !== 'void' && <button onClick={() => handleInitiateVoid(inv.id)} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drawer Popover */}
          {showDrawerBalancePopup && (() => {
            const balances = getLiveDrawerBalances();
            return (
              <div className="absolute right-4 top-4 bg-slate-900 border border-slate-700 p-4 rounded-2xl text-white shadow-2xl w-64 z-20 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase text-slate-400">Live Drawer Math</span>
                  <button onClick={() => setShowDrawerBalancePopup(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-1"><span className="text-slate-400">Float:</span> <span className="font-mono">Rs. {(balances.openingFloat/100).toFixed(2)}</span></div>
                  <div className="flex justify-between border-b border-slate-800 pb-1"><span className="text-slate-400">Cash:</span> <span className="font-mono text-emerald-400">Rs. {(balances.cashBalance/100).toFixed(2)}</span></div>
                  <div className="flex justify-between border-b border-slate-800 pb-1"><span className="text-slate-400">Card:</span> <span className="font-mono text-indigo-400">Rs. {(balances.cardBalance/100).toFixed(2)}</span></div>
                  <div className="flex justify-between border-b border-slate-800 pb-1"><span className="text-slate-400">Transfer:</span> <span className="font-mono text-sky-400">Rs. {(balances.bankTransferBalance/100).toFixed(2)}</span></div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* ============================================================================================== */}
      {/* SHIFT & ACTION MODALS (Frozen Top Level) */}
      {/* ============================================================================================== */}
      
      {/* Checkout Calculator / Payment Action */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up">
            <h3 className="text-base font-black text-slate-800 text-center">Confirm {paymentMethod.toUpperCase()} Payment</h3>
            <div className="bg-slate-50 p-4 rounded-xl text-center space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Due</span>
              <div className="text-3xl font-black font-mono text-emerald-600">{currencySign}{total.toFixed(2)}</div>
            </div>
            
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Cash Tendered by Customer</label>
                <input ref={cashInputRef} type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCheckoutSubmit()} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-mono font-black focus:border-emerald-500 focus:outline-none transition-colors" placeholder="0.00" />
                {parseFloat(amountReceived) >= total && (
                  <div className="flex justify-between text-xs font-bold bg-emerald-50 text-emerald-700 p-2 rounded-lg mt-2">
                    <span>Change Due:</span>
                    <span className="font-mono">{currencySign}{(parseFloat(amountReceived) - total).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowCheckoutModal(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs flex-1 transition-colors">Cancel</button>
              <button onClick={handleCheckoutSubmit} disabled={isProcessing || (paymentMethod === 'cash' && Number(amountReceived) < total)} className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex-[2] transition-colors disabled:opacity-50 shadow-md">Complete Transaction</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details / Print / Void Modal */}
      {selectedInvoiceDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-sky-100 max-h-[85vh] w-full max-w-md flex flex-col shadow-2xl animate-scale-up text-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Invoice {selectedInvoiceDetails.id}</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedInvoiceDetails.date} • {selectedInvoiceDetails.createdBy}</p>
              </div>
              <button onClick={() => setSelectedInvoiceDetails(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              <div className="bg-indigo-50 p-3 rounded-xl">
                <span className="font-bold text-indigo-900 block">{selectedInvoiceDetails.ownerName}</span>
                <span className="text-[10px] text-indigo-600 font-mono block mt-0.5">{selectedInvoiceDetails.ownerPhone}</span>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] text-slate-400 font-bold border-b border-slate-100">
                  <tr><th className="pb-2">Item</th><th className="pb-2 text-center">Qty</th><th className="pb-2 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {selectedInvoiceDetails.items.map((i, idx) => (
                    <tr key={idx}><td className="py-2">{i.name}</td><td className="py-2 text-center">{i.quantity}</td><td className="py-2 text-right font-mono">{currencySign}{i.totalPrice.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2 shrink-0 bg-slate-50">
              <button onClick={() => handlePrintReceipt(selectedInvoiceDetails)} className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-1"><Printer className="w-4 h-4"/> Print</button>
              {selectedInvoiceDetails.paymentStatus !== 'void' && (
                <button onClick={() => handleInitiateVoid(selectedInvoiceDetails.id)} className="flex-1 py-2.5 border border-rose-200 text-rose-600 font-bold rounded-xl bg-white hover:bg-rose-50">Void</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Challenge Modal (Unchanged Layout) */}
      {showPinChallenge && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl animate-scale-up text-xs">
            <h4 className="text-sm font-extrabold text-slate-800">Admin Override Required</h4>
            <input type="password" maxLength={4} placeholder="PIN" value={enteredChallengePin} onChange={e => setEnteredChallengePin(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-center text-xl font-mono tracking-widest rounded-xl focus:outline-none focus:border-indigo-500" />
            <div className="flex gap-2">
              <button onClick={() => setShowPinChallenge(false)} className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl">Cancel</button>
              <button onClick={handleVerifyChallengePin} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl">Authorize Void</button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Modals (Open/Close Z-Report - Unchanged Flow) */}
      {!currentActiveShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 text-xs animate-fade-in">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-black text-slate-800 text-base text-center">Open Register Shift</h3>
            <div>
              <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase">Opening Cash Float (Drawer)</label>
              <input type="number" value={openingFloatInput} onChange={e => setOpeningFloatInput(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-mono text-lg font-black focus:outline-none focus:border-emerald-500 text-center" placeholder="0.00" />
            </div>
            <button onClick={handleOpenShift} disabled={isProcessing} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md">Open Terminal Session</button>
          </div>
        </div>
      )}

      {showCloseShiftModal && (() => {
        const z = getZReportCalculations();
        return (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-black text-slate-800 text-sm">Close Shift & Print Z-Report</h3>
                <button onClick={() => setShowCloseShiftModal(false)} className="text-slate-400 font-bold">✕</button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                <div className="bg-slate-100 p-4 rounded-xl flex justify-between font-bold text-slate-700 font-mono text-sm">
                  <span>Expected Drawer:</span><span>Rs. {(z.expectedClosingCash/100).toFixed(2)}</span>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[10px] uppercase tracking-wide">Actual Counted Cash</label>
                  <input type="number" value={actualCashInput} onChange={e => setActualCashInput(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-lg font-black focus:outline-none focus:border-rose-500" placeholder="0.00" />
                </div>
                {Math.round((parseFloat(actualCashInput) || 0) * 100) !== z.expectedClosingCash && (
                  <textarea placeholder="Reason for variance..." value={closeNotesInput} onChange={e => setCloseNotesInput(e.target.value)} className="w-full p-3 border border-rose-200 rounded-xl focus:outline-none" />
                )}
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0">
                <button onClick={() => handleCompileAndCloseShiftZReport(actualCashInput, closeNotesInput).then(() => { setShowCloseShiftModal(false); setActualCashInput(''); })} className="w-full py-3 bg-slate-900 text-white font-black rounded-xl">Confirm & Print Report</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Success Modal Override */}
      {checkoutSuccess && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-scale-up">
             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><Check className="w-8 h-8" /></div>
             <h3 className="text-xl font-black text-slate-800">Paid in Full</h3>
             <p className="text-slate-500 text-xs font-semibold">Total: {currencySign}{checkoutSuccess.sales_total.toFixed(2)}</p>
             <div className="flex gap-2 pt-2">
               <button onClick={() => handlePrintReceipt(checkoutSuccess)} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-1"><Printer className="w-4 h-4"/> Print</button>
               <button onClick={() => setCheckoutSuccess(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Close</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
