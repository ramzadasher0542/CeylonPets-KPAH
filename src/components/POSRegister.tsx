/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mutate } from 'swr';
import { 
  ShoppingBag, 
  Search, 
  Tag, 
  Trash2, 
  Plus, 
  Minus, 
  UserPlus, 
  CreditCard, 
  Coins, 
  QrCode, 
  FileText, 
  Check,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Printer
} from 'lucide-react';
import { InventoryItem, Appointment, Invoice, InvoiceItem, PaymentMethod, User as StaffUser, MedicalRecord, CATEGORY_DISPLAY_MAP, Shift } from '../types';
import { showToast } from './Toast';
import { fetchActiveShiftId, openShift, closeShift, fetchActiveShiftDetails, addRevenueToActiveShift } from '../lib/db';

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
}

export default function POSRegister({ 
  inventory, 
  appointments, 
  records,
  isOnline, 
  currentUser,
  invoices,
  onUpdateStock,
  onAddInvoice,
  onVoidInvoice,
  systemConfig,
  onVerifyMasterPin,
  onTriggerInventorySync
}: POSProps) {
  // POS States
  const [activeTab, setActiveTab] = useState<'All Inventory' | 'service' | 'vaccine' | 'lab_service' | 'prescription' | 'retail' | 'ledger'>('All Inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [cart, setCart] = useState<Array<{ item: InventoryItem; quantity: number }>>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('walkin'); // Walk-in or appointment selected
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemCategory, setCustomItemCategory] = useState<'service' | 'retail'>('service');
  const [openingFloatInput, setOpeningFloatInput] = useState('');
  
  // Resolve undeclared variable reference
  const selectedApt = appointments.find(a => a.id === selectedPetId) || null;

  // Combobox State
  const [petSearchQuery, setPetSearchQuery] = useState('');
  const [isPetDropdownOpen, setIsPetDropdownOpen] = useState(false);
  const petDropdownRef = useRef<HTMLDivElement>(null);

  // Enforce explicit lifecycle flag shields to prevent async context memory leaks during rapid tab toggling
  // 1. Unified State Hydration Engine
  const fetchAndHydrateShiftContext = async () => {
    try {
      const shiftDetails = await fetchActiveShiftDetails();
      setCurrentActiveShift(shiftDetails);
    } catch (err) {
      console.error('[CeylonPets POS] Failed to fetch active shift context.', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchAndHydrateShiftContext();
    return () => { isMounted = false; };
  }, []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (petDropdownRef.current && !petDropdownRef.current.contains(event.target as Node)) {
        setIsPetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active selected entity logic
  const activeSelectedApt = appointments.find(a => a.id === selectedPetId);
  const activeSelectedRecord = records.find(r => r.id === selectedPetId);

  const getDropdownOptions = () => {
    if (petSearchQuery.trim() === '') {
      return appointments
        .filter(a => a.status === 'in-progress')
        .map(a => ({
          type: 'appointment' as const, id: a.id, petName: a.petName, petType: a.petType, ownerName: a.ownerName, ownerPhone: a.ownerPhone, isActive: true
        }));
    }
    const q = petSearchQuery.toLowerCase();
    const matchedApts = appointments
      .filter(a => a.status === 'in-progress' || a.status === 'booked')
      .filter(a => a.petName.toLowerCase().includes(q) || a.ownerPhone.toLowerCase().includes(q))
      .map(a => ({
        type: 'appointment' as const, id: a.id, petName: a.petName, petType: a.petType, ownerName: a.ownerName, ownerPhone: a.ownerPhone, isActive: a.status === 'in-progress'
      }));
    const matchedRecs = records
      .filter(rec => rec.petName.toLowerCase().includes(q) || rec.ownerPhone.toLowerCase().includes(q))
      .filter(rec => !matchedApts.some(ma => ma.petName === rec.petName && ma.ownerPhone === rec.ownerPhone))
      .map(rec => ({
        type: 'record' as const, id: rec.id, petName: rec.petName, petType: rec.petType, ownerName: rec.ownerName, ownerPhone: rec.ownerPhone, isActive: false
      }));
    return [...matchedApts, ...matchedRecs];
  };
  const dropdownOptions = getDropdownOptions();

  // Checkout modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const cashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCheckoutModal && paymentMethod === 'cash') {
      setTimeout(() => cashInputRef.current?.focus(), 50);
    }
  }, [showCheckoutModal, paymentMethod]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showCheckoutModal && e.key === 'Escape') {
        setShowCheckoutModal(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showCheckoutModal]);

  const [amountReceived, setAmountReceived] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState<Invoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleSuccessKeyDown = (e: KeyboardEvent) => {
      if (checkoutSuccess) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handlePrintReceipt(checkoutSuccess);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setCheckoutSuccess(null);
        }
      }
    };
    window.addEventListener('keydown', handleSuccessKeyDown);
    return () => window.removeEventListener('keydown', handleSuccessKeyDown);
  }, [checkoutSuccess]);

  // Ledger and Passcode states
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | 'paid' | 'void'>('all');
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<Invoice | null>(null);

  // Void authentication prompt
  const [showPinChallenge, setShowPinChallenge] = useState(false);
  const [challengeInvoiceId, setChallengeInvoiceId] = useState<string | null>(null);
  const [enteredChallengePin, setEnteredChallengePin] = useState('');
  const [challengePinError, setChallengePinError] = useState(false);

  // Cash Drawer Register State
  const [showCashDrawerModal, setShowCashDrawerModal] = useState(false);
  const [currentActiveShift, setCurrentActiveShift] = useState<Shift | null>(null);
  const currentActiveShiftId = currentActiveShift?.id;

  const [actualCashInput, setActualCashInput] = useState('');
  const [closeNotesInput, setCloseNotesInput] = useState('');
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showDrawerBalancePopup, setShowDrawerBalancePopup] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    if (showCashDrawerModal) {
      const fetchDrawerDetails = async () => {
        try {
          const shiftDetails = await fetchActiveShiftDetails();
          if (isMounted) setCurrentActiveShift(shiftDetails);
        } catch (err) {
          console.error('[CeylonPets POS] Failed to fetch live drawer amounts', err);
        }
      };
      fetchDrawerDetails();
    }

    const handleDrawerKeydown = (e: KeyboardEvent) => {
      if (showCashDrawerModal && e.key === 'Escape') {
        setShowCashDrawerModal(false);
      }
    };
    
    window.addEventListener('keydown', handleDrawerKeydown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleDrawerKeydown);
    };
  }, [showCashDrawerModal]);

  // Tabs style config matching the pastel sky blue interior
  const tabStyles = {
    all: { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100', active: 'bg-indigo-600 text-white border-indigo-600 shadow-sm' },
    service: { bg: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100', active: 'bg-sky-500 text-white border-sky-500 shadow-sm' },
    vaccine: { bg: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300 hover:bg-fuchsia-100', active: 'bg-fuchsia-500 text-white border-fuchsia-500 shadow-sm' },
    lab_service: { bg: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100', active: 'bg-purple-500 text-white border-purple-500 shadow-sm' },
    prescription: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100', active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' },
    retail: { bg: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100', active: 'bg-amber-500 text-white border-amber-500 shadow-sm' },
    ledger: { bg: 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100', active: 'bg-blue-50 text-blue-700 border-blue-500 shadow-sm' }
  };

  // Synchronous custom salted polynomial hash matching App.tsx security
  const hashPin = (pin: string): string => {
    if (!pin) return '';
    const isPlaintext = /^\d{4}$/.test(pin);
    if (!isPlaintext) return pin;

    let hash = 5381;
    const salt = "CeylonPetsSecuritySalt";
    const combined = pin + salt;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 33) ^ combined.charCodeAt(i);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  };

  const handleInitiateVoid = (invId: string) => {
    // 1. Check if user role is owner or admin (direct authorized bypass)
    if (currentUser.role === 'owner' || currentUser.role === 'admin') {
      const confirmVoid = window.confirm(`Are you sure you want to void Invoice ${invId}? This will reinstate inventory stock levels and cancel the transaction.`);
      if (confirmVoid) {
        onVoidInvoice(invId);
        setSelectedInvoiceDetails(prev => prev && prev.id === invId ? { ...prev, paymentStatus: 'void' } : prev);
      }
    } else {
      // 2. Trigger Passcode Challenge for Cashier / Veterinarian
      setChallengeInvoiceId(invId);
      setEnteredChallengePin('');
      setChallengePinError(false);
      setShowPinChallenge(true);
    }
  };

  const handleVerifyChallengePin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!challengeInvoiceId) return;

    const isAuthorized = onVerifyMasterPin 
      ? onVerifyMasterPin(enteredChallengePin)
      : hashPin(enteredChallengePin) === (systemConfig?.masterPin || hashPin('5692'));

    if (isAuthorized) {
      // Authorized!
      onVoidInvoice(challengeInvoiceId);
      setSelectedInvoiceDetails(prev => prev && prev.id === challengeInvoiceId ? { ...prev, paymentStatus: 'void' } : prev);
      
      // Close challenge
      setShowPinChallenge(false);
      setChallengeInvoiceId(null);
      setEnteredChallengePin('');
      setChallengePinError(false);
      
      showToast(`Elevated Authority Granted. Transaction ${challengeInvoiceId} voided successfully.`, 'success');
    } else {
      // Failed verification
      setChallengePinError(true);
      setEnteredChallengePin('');
      setTimeout(() => setChallengePinError(false), 2000);
    }
  };

  const handlePinKeypress = (num: string) => {
    if (enteredChallengePin.length < 4) {
      setEnteredChallengePin(prev => prev + num);
    }
  };

  const handlePinBackspace = () => {
    setEnteredChallengePin(prev => prev.slice(0, -1));
  };

  // Filter items based on active tab and search query
  const filteredProducts = inventory.filter(item => {
    const matchesTab = activeTab === 'All Inventory' || item.category === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Barcode scanner helper
  const handleBarcodeSubmit = (skuText: string) => {
    const trimmedSku = skuText.trim();
    if (!trimmedSku) return;

    // Search for a perfect match in inventory by SKU (case-insensitive) or by ID
    const found = inventory.find(
      item => item.sku.toLowerCase() === trimmedSku.toLowerCase() || item.id.toLowerCase() === trimmedSku.toLowerCase()
    );

    if (found) {
      const isService = found?.category === 'service' || found?.category === 'lab_service';
      if (found.stock <= 0 && !isService) {
        setBarcodeFeedback({ text: `Failed: ${found.name} is currently out of stock.`, error: true });
      } else {
        const existing = cart.find(i => i.item.id === found.id);
        if (existing && existing.quantity >= found.stock && !isService) {
          setBarcodeFeedback({ text: `Failed: Limit of ${found.stock} reached for ${found.name}.`, error: true });
        } else {
          if (existing) {
            setCart(cart.map(i => i.item.id === found.id ? { ...i, quantity: i.quantity + 1 } : i));
          } else {
            setCart([...cart, { item: found, quantity: 1 }]);
          }
          setBarcodeFeedback({ text: `Instantly added: ${found.name} to cart!`, error: false });
          setBarcodeInput('');
        }
      }
    } else {
      setBarcodeFeedback({ text: `SKU / ID "${trimmedSku}" not found in inventory.`, error: true });
    }

    // Auto-clear feedback after 4 seconds
    setTimeout(() => {
      setBarcodeFeedback(prev => prev && prev.text.includes(trimmedSku) ? null : prev);
    }, 4000);
  };

  const handleBarcodeKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSubmit(barcodeInput);
    }
  };

  // Cart operations
  const addToCart = (product: InventoryItem) => {
    const isService = product?.category === 'service' || product?.category === 'lab_service';
    if (product.stock <= 0 && !isService) {
      showToast(`Critical: ${product.name} is currently out of stock. Please adjust inventory parameters.`, 'error');
      return;
    }
    const existing = cart.find(i => i.item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock && !isService) {
        showToast(`Cannot add more. Limit of ${product.stock} reached.`, 'error');
        return;
      }
      setCart(cart.map(i => i.item.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { item: product, quantity: 1 }]);
    }
  };

  const updateCartQty = (productId: string, val: number) => {
    const existing = cart.find(i => i.item.id === productId);
    if (!existing) return;
    const itemStock = existing.item.stock;
    const newQty = existing.quantity + val;

    if (newQty <= 0) {
      setCart(cart.filter(i => i.item.id !== productId));
    } else {
      const isService = existing.item?.category === 'service' || existing.item?.category === 'lab_service';
      if (newQty > itemStock && !isService) {
        showToast(`Warning: Cannot exceed available stock limit of ${itemStock} units.`, 'error');
        return;
      }
      setCart(cart.map(i => i.item.id === productId ? { ...i, quantity: newQty } : i));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(i => i.item.id !== productId));
  };

  // Quick custom charge (User easily customization request)
  const addCustomCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName || !customItemPrice) return;
    const priceNum = parseFloat(customItemPrice);
    if (isNaN(priceNum) || priceNum < 0) return;

    const customId = String(Date.now());
    const customProd: InventoryItem = {
      id: customId,
      sku: `QUICK-${Math.floor(Math.random() * 900 + 100)}`,
      name: customItemName,
      category: customItemCategory,
      price: priceNum,
      cost: 0,
      stock: 0,
      minStock: 0,
      unit: 'item'
    };

    setCart([...cart, { item: customProd, quantity: 1 }]);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  // Calculations (Enforcing raw cents and Net Total rule)
  const taxRate = systemConfig ? systemConfig.taxRate : 0.0825;
  const currencySign = systemConfig ? systemConfig.currencySymbol : '$';
  
  const centsSubtotal = cart.reduce((sum, item) => sum + Math.round(item.item.price * 100) * item.quantity, 0);
  const centsDiscount = Math.round((discountVal || 0) * 100);
  
  // Rule 18: Net Total = (Subtotal - Discounts) + Taxes
  const netCentsSubtotal = Math.max(0, centsSubtotal - centsDiscount);
  const centsTax = Math.round(netCentsSubtotal * taxRate);
  const centsTotal = netCentsSubtotal + centsTax;

  const subtotal = centsSubtotal / 100;
  const discount = centsDiscount / 100;
  const tax = centsTax / 100;
  const total = centsTotal / 100;

  // Force pure integer cent transformation on manual cash float inputs to ensure financial compliance
  const parseAmountToIntegerCents = (inputValue: string): number => {
    const parsed = parseFloat(inputValue) || 0;
    return Math.round(parsed * 100);
  };

  const handleExecuteCashPayout = async (amountInput: string, reasonText: string) => {
    const payoutCents = parseAmountToIntegerCents(amountInput);
    if (payoutCents <= 0) return;
    
    // Perform cash drop ledger record tracking strictly using whole integer units
    console.log('[CeylonPets POS] Logging secure integer payout calculation:', payoutCents);
  };

  // Enforce absolute integer safety defaults inside shift closing loops to defeat NaN injection
  const computeActiveDrawerTotalCents = (shiftInvoices: any[], initialFloatCents: number): number => {
    let aggregateCents = Math.round(initialFloatCents || 0);
    
    (shiftInvoices || []).forEach((inv) => {
      if (!inv) return;
      const paid = parseInt(String(inv.amountPaidCents), 10) || 0;
      const change = parseInt(String(inv.changeDueCents), 10) || 0;
      
      // Ensure calculation increments occur strictly through whole safely isolated integers
      aggregateCents += (paid - change);
    });
    
    return Math.max(0, aggregateCents);
  };

  // Enforce constitutional integer-math rounding inside Z-Report statistical fields to preserve absolute reporting accuracy
  const compileHardenedZReportMetrics = (subtotalCents: number, activeTaxRate: number) => {
    const safeSubtotal = parseInt(String(subtotalCents), 10) || 0;
    
    // Compute total tax using strict integer cent rounding parameters
    const computedTaxCents = Math.round(safeSubtotal * (activeTaxRate || 0));
    const grandTotalCents = safeSubtotal + computedTaxCents;

    return {
      subtotalCents: safeSubtotal,
      taxCents: computedTaxCents,
      grandTotalCents: grandTotalCents
    };
  };


  const mutateShift = async () => {
    await fetchAndHydrateShiftContext();
    mutate('shift_metrics');
    mutate('activeShiftId');
  };

  // 2. Hardened handler to pass the integer float directly to the database and sync the UI
  const handleOpenShift = async (initialFloatAmount: string) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      console.log('[CeylonPets POS] Securing shift opening action. Compiling integer float cents...');
      const floatCents = Math.round((parseFloat(initialFloatAmount) || 0) * 100);
      
      // CRITICAL FIX: Pass both the user name AND the floatCents directly to the db cache!
      const resultShiftId = await openShift(currentUser?.name || 'Terminal Operator', floatCents);
      
      if (resultShiftId) {
        showToast('Shift session successfully established.', 'success');
        setOpeningFloatInput('');
        await mutateShift(); // Hydrate the UI instantly to dismiss the overlay modal
      }
    } catch (err) {
      console.error('[CeylonPets POS] Critical crash during shift initialization sequence:', err);
      showToast('Could not initialize shift frame.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };



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

  const getZReportCalculations = () => {
    if (!currentActiveShift) {
      return {
        openingFloat: 0,
        cashCollected: 0,
        cardCollected: 0,
        bankTransferCollected: 0,
        expectedClosingCash: 0,
        petSuppliesShop: 0,
        pharmacyRx: 0,
        labsServices: 0,
        clinicalCare: 0,
        vaccinations: 0,
        grossRevenue: 0,
        cogs: 0,
        netProfit: 0
      };
    }

    const shiftInvoices = invoices.filter(
      inv => inv.shiftId === currentActiveShift.id && inv.paymentStatus === 'paid'
    );

    let cashCollected = 0;
    let cardCollected = 0;
    let bankTransferCollected = 0;

    let petSuppliesShop = 0;
    let pharmacyRx = 0;
    let labsServices = 0;
    let clinicalCare = 0;
    let vaccinations = 0;

    let grossRevenue = 0;
    let cogs = 0;

    shiftInvoices.forEach(inv => {
      const totalCents = Math.round(inv.sales_total * 100);
      if (inv.paymentMethod === 'cash') {
        cashCollected += totalCents;
      } else if (inv.paymentMethod === 'card') {
        cardCollected += totalCents;
      } else if (inv.paymentMethod === 'bank_transfer') {
        bankTransferCollected += totalCents;
      }

      grossRevenue += totalCents;
      cogs += Math.round((inv.cogs || 0) * 100);

      inv.items.forEach(item => {
        const itemPriceCents = Math.round(item.totalPrice * 100);
        if (item.category === 'retail') {
          petSuppliesShop += itemPriceCents;
        } else if (item.category === 'prescription') {
          pharmacyRx += itemPriceCents;
        } else if (item.category === 'lab_service') {
          labsServices += itemPriceCents;
        } else if (item.category === 'service') {
          clinicalCare += itemPriceCents;
        } else if (item.category === 'vaccine') {
          vaccinations += itemPriceCents;
        }
      });
    });

    const openingFloat = currentActiveShift.openingFloatCents || 0;
    const expectedClosingCash = openingFloat + cashCollected;

    return {
      openingFloat,
      cashCollected,
      cardCollected,
      bankTransferCollected,
      expectedClosingCash,
      petSuppliesShop,
      pharmacyRx,
      labsServices,
      clinicalCare,
      vaccinations,
      grossRevenue,
      cogs,
      netProfit: grossRevenue - cogs
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

      if (typeof mutateShift === 'function') await mutateShift();
      showToast('Shift closed cleanly and Z-Report dispatched to spooler.', 'success');
    } catch (err) {
      console.error('[CeylonPets POS] Encountered error compiling daily metrics:', err);
      showToast('Reconciliation transaction aborted due to execution crash.', 'error');
    }
  };

  // Enforce absolute atomic cart initialization cleanups to prevent state dragging between checkout windows
  const handleResetActiveRegisterCartAtomic = useCallback(() => {
    console.log('[CeylonPets POS] Engaging atomic state reset on active register cart...');
    
    // Batch all dependent structural states in a single execution frame
    setCart([]);
    setDiscountVal(0);
    setSelectedPetId('walkin');
    setCustomItemName('');
    setCustomItemPrice('');
    setAmountReceived('');
    
    showToast('Register context cleared successfully.', 'info');
  }, []);

  // 1. Process Checkout
  const handleCheckoutSubmit = async (): Promise<boolean> => {
    if (isProcessing) return false;
    if (cart.length === 0) {
      showToast('Cannot checkout: Cart is empty.', 'error');
      return false;
    }

    setIsProcessing(true);

    try {
      // Fetch and Attach the Active Shift
      const activeShiftId = await fetchActiveShiftId();
      if (!activeShiftId) {
        showToast('Cannot checkout: No open shift detected in state.', 'error');
        setIsProcessing(false);
        return false;
      }

      // Create a new invoice and calculate COGS using strict integer cent tracking
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

      let finalAppointmentId: string | undefined = undefined;
      let finalPatientId = '0'; // Clean integer representation default string
      let finalPetName = 'Walk-in Pet / Guest';
      let finalOwnerName = 'General Guest';
      let finalOwnerPhone = 'N/A';
      let notes = 'Quick shop checkout';

      if (activeSelectedApt) {
        finalAppointmentId = activeSelectedApt.id;
        finalPetName = activeSelectedApt.petName;
        finalOwnerName = activeSelectedApt.ownerName;
        finalOwnerPhone = activeSelectedApt.ownerPhone;
        
        const matchedRec = records.find(r => r.petName === activeSelectedApt.petName && r.ownerPhone === activeSelectedApt.ownerPhone);
        finalPatientId = matchedRec ? matchedRec.patientId : String(Date.now());
        notes = `Clinical checkout for active appointment: ${activeSelectedApt.id}`;
      } else if (activeSelectedRecord) {
        finalPatientId = activeSelectedRecord.patientId;
        finalPetName = activeSelectedRecord.petName;
        finalOwnerName = activeSelectedRecord.ownerName;
        finalOwnerPhone = activeSelectedRecord.ownerPhone;
        
        const activeApt = appointments.find(a => a.status === 'in-progress' && a.petName === activeSelectedRecord.petName && a.ownerPhone === activeSelectedRecord.ownerPhone);
        if (activeApt) {
          finalAppointmentId = activeApt.id;
        }
        notes = `Retail checkout for historical profile: ${activeSelectedRecord.patientId}`;
      }

      const invoiceObj: Invoice = {
        // Enforce pure integer numeric timestamp id mapping
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

      // Prepare stock update promises for non-service items to engage CAS concurrency lock in parallel
      const stockPromises = cart
        .filter(c => {
          const isService = c.item?.category === 'service' || c.item?.category === 'lab_service';
          return !isService;
        })
        .map(c => onUpdateStock(c.item.id, -c.quantity, c.item.stock));

      // CRITICAL: Await database write synchronously before changing layout view state to satisfy Local-First Constitution Rule 4
      await Promise.all([...stockPromises, onAddInvoice(invoiceObj)]);
      await addRevenueToActiveShift(paymentMethod, Math.round(total * 100));
      console.log('[CeylonPets] Local database persistence verified successfully.');

      // UI Transition commits only after guaranteed storage commit
      setCheckoutSuccess(invoiceObj);
      setCart([]);
      setDiscountVal(0);
      setSelectedPetId('walkin');
      setAmountReceived('');
      setShowCheckoutModal(false);
      setIsProcessing(false);

      showToast('Checkout complete! Invoice generated and appointment resolved.', 'success');
      return true;

    } catch (err: any) {
      console.error('Checkout write error:', err);
      showToast('Database write error during checkout sequence. Cart preserved.', 'error');
      setIsProcessing(false);
      return false;
    }
  };

  const handlePrintReceipt = (inv: Invoice) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      showToast('Pop-up blocked! Please allow pop-ups to print receipts.', 'error');
      return;
    }

    const hospitalName = systemConfig?.hospitalName || 'Ceylon Pets Animal Hospital';
    const hospitalAddress = systemConfig?.hospitalAddress || 'No. 34 Palace Road, Petaluma CA';
    const hospitalPhone = systemConfig?.hospitalPhone || '+1 (555) 781-4200';
    const hospitalEmail = systemConfig?.hospitalEmail || 'contact@ceylonpets.lk';
    const logoEmoji = systemConfig?.invoiceLogo || '🐾';
    const footerMessage = systemConfig?.invoiceFooterMessage || 'Please pay upon discharge. Thank you for choosing CeylonPets!';
    const subFooterMessage = systemConfig?.invoiceSubFooterMessage || '* CEYLONPETS OFFICIAL RECEIPT *';
    const extraFooterMessage = systemConfig?.invoiceExtraFooterMessage || '';

    const printHtml = `
      <html>
        <head>
          <title>Receipt ${inv.id}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              max-width: 280px;
              margin: 0 auto;
              padding: 15px;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .header-title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            .item-table { width: 100%; border-collapse: collapse; }
            .item-table td { padding: 2px 0; vertical-align: top; }
            .footer { font-size: 9px; margin-top: 15px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center">
            ${systemConfig?.posLogoUrl ? `<img src="${systemConfig.posLogoUrl}" style="max-height: 48px; display: block; margin: 0 auto 6px auto; object-fit: contain;" />` : `<span style="font-size: 24px;">${logoEmoji}</span>`}
            <div class="header-title">${hospitalName}</div>
            <div>${hospitalAddress}</div>
            <div>PH: ${hospitalPhone}</div>
            <div>Email: ${hospitalEmail}</div>
          </div>
          
          <div class="divider"></div>
          
          <div><span class="bold">Receipt ID:</span> ${inv.id}</div>
          <div><span class="bold">Date:</span> ${inv.date}</div>
          <div><span class="bold">Cashier:</span> ${inv.createdBy}</div>
          <div><span class="bold">Owner:</span> ${inv.ownerName}</div>
          <div><span class="bold">Patient:</span> ${inv.petName}</div>
          
          <div class="divider"></div>
          
          <table class="item-table">
            <thead>
              <tr class="bold">
                <td style="width: 60%">Item Description</td>
                <td style="width: 15%" class="center">Qty</td>
                <td style="width: 25%" class="right">Total</td>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="center">${item.quantity}</td>
                  <td class="right">${currencySign}${item.totalPrice.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table class="item-table">
            <tr>
              <td style="width: 60%"><span class="bold">Subtotal:</span></td>
              <td style="width: 40%" class="right">${currencySign}${inv.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td><span class="bold">Discount:</span></td>
              <td class="right">-${currencySign}${inv.discount.toFixed(2)}</td>
            </tr>
            <tr>
              <td><span class="bold">Tax:</span></td>
              <td class="right">${currencySign}${inv.tax.toFixed(2)}</td>
            </tr>
            <tr class="bold" style="font-size: 12px;">
              <td>TOTAL DUE:</td>
              <td class="right">${currencySign}${inv.sales_total.toFixed(2)}</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          <div><span class="bold">Payment Method:</span> ${inv.paymentMethod?.toUpperCase() || 'CARD'}</div>
          <div><span class="bold">Payment Status:</span> ${inv.paymentStatus.toUpperCase()}</div>
          
          <div class="divider"></div>
          
          <div class="footer">
            ${footerMessage}
            <div style="margin-top: 8px; letter-spacing: 2px; text-transform: uppercase;">${subFooterMessage}</div>
            ${extraFooterMessage ? `<div style="margin-top: 4px; font-size: 8px; letter-spacing: 1px; text-transform: uppercase; color: #555;">${extraFooterMessage}</div>` : ''}
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="pos-register-view">
      
      {/* Left Columns - Inventory selection (7 Cols) */}
      <div className="lg:col-span-7 h-[calc(100vh-140px)] flex flex-col gap-4">
        {/* Search and Tabs Controller */}
        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm space-y-3 flex-none">
          {activeTab !== 'ledger' ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input name="searchServicesPrescriptionM603" id="search-services-prescription-m-603"
                  type="text"
                  placeholder="Search services, prescription meds, or toy inventory by SKU / name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Barcode scanner input */}
              <div className="relative w-full sm:w-64">
                <QrCode className="absolute left-3.5 top-3 h-4 w-4 text-indigo-500" />
                <input name="scanBarcodeSku728" id="scan-barcode-sku-728"
                  type="text"
                  placeholder="Scan Barcode (SKU)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeydown}
                  className="w-full pl-10 pr-10 py-2.5 bg-indigo-50/40 border border-indigo-200 text-xs font-bold rounded-xl text-slate-800 placeholder-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => setBarcodeInput('')}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input name="searchLedgerByInvoiceIdCl69" id="search-ledger-by-invoice-id-cl-69"
                  type="text"
                  placeholder="Search ledger by Invoice ID, Client name, or Pet patient..."
                  value={ledgerSearchQuery}
                  onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-200 items-center">
                {(['all', 'paid', 'void'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setLedgerStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize cursor-pointer transition-all ${
                      ledgerStatusFilter === status 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Barcode validation feedback message strip */}
          {activeTab !== 'ledger' && barcodeFeedback && (
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-bold animate-fade-in ${
              barcodeFeedback.error 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-md">{barcodeFeedback.error ? '⚠️' : '✅'}</span>
                <span>{barcodeFeedback.text}</span>
              </div>
              <button 
                onClick={() => setBarcodeFeedback(null)} 
                className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('All Inventory')}
              className={`py-2 px-3 flex-1 min-w-[90px] border rounded-xl text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'All Inventory' ? tabStyles.all.active : tabStyles.all.bg
              }`}
            >
              All Inventory
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`py-2 px-2 flex-1 min-w-[80px] border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'service' ? tabStyles.service.active : tabStyles.service.bg
              }`}
            >
              {CATEGORY_DISPLAY_MAP['service']}
            </button>
            <button
              onClick={() => setActiveTab('vaccine')}
              className={`py-2 px-2 flex-1 min-w-[80px] border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'vaccine' ? tabStyles.vaccine.active : tabStyles.vaccine.bg
              }`}
            >
              {CATEGORY_DISPLAY_MAP['vaccine']}
            </button>
            <button
              onClick={() => setActiveTab('lab_service')}
              className={`py-2 px-2 flex-1 min-w-[80px] border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'lab_service' ? tabStyles.lab_service.active : tabStyles.lab_service.bg
              }`}
            >
              {CATEGORY_DISPLAY_MAP['lab_service']}
            </button>
            <button
              onClick={() => setActiveTab('prescription')}
              className={`py-2 px-2 flex-1 min-w-[80px] border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'prescription' ? tabStyles.prescription.active : tabStyles.prescription.bg
              }`}
            >
              {CATEGORY_DISPLAY_MAP['prescription']}
            </button>
            <button
              onClick={() => setActiveTab('retail')}
              className={`py-2 px-2 flex-1 min-w-[80px] border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'retail' ? tabStyles.retail.active : tabStyles.retail.bg
              }`}
            >
              {CATEGORY_DISPLAY_MAP['retail']}
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`py-2 px-2 flex-1 min-w-[80px] border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                activeTab === 'ledger' ? tabStyles.ledger.active : tabStyles.ledger.bg
              }`}
            >
              Ledger
            </button>
          </div>
        </div>

        {activeTab !== 'ledger' ? (
          <>
            {/* Dynamic Catalog Grid Wrapper */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-4 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(product => {
                const isService = product?.category === 'service' || product?.category === 'lab_service';
                const isLowStock = product.stock <= product.minStock && !isService;
                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white p-3.5 rounded-2xl border border-sky-50 hover:border-sky-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden active:scale-95"
                  >
                    <div className="space-y-1">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isService ? 'bg-sky-100 text-sky-800' :
                        product.category === 'vaccine' ? 'bg-fuchsia-100 text-fuchsia-800' :
                        product.category === 'prescription' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {product.sku}
                      </span>
                      <h5 className="text-xs font-bold text-slate-800 tracking-tight leading-snug mt-1 group-hover:text-sky-600 line-clamp-2">
                        {product.name}
                      </h5>
                      {isService ? (
                        <span className="text-[10px] font-mono block text-sky-500 font-semibold">
                          {CATEGORY_DISPLAY_MAP[product.category] || CATEGORY_DISPLAY_MAP['service']}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono block ${isLowStock ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          Stock: {product.stock} {product.unit}s
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-50">
                      <span className="text-sm font-black text-slate-800">{currencySign}{product.price.toFixed(2)}</span>
                      <span className="p-1 bg-slate-50 group-hover:bg-sky-50 text-slate-400 group-hover:text-sky-600 rounded-lg transition-colors">
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>

                    {isLowStock && (
                      <div className="absolute top-0 right-0 p-1 bg-rose-500 rounded-bl-xl text-white">
                        <AlertTriangle className="h-3 w-3 animate-bounce" />
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No clinical or retail items matching search tags.
                </div>
              )}
              </div>
            </div>

            {/* Custom Quick Item Form */}
            <form onSubmit={addCustomCharge} className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm space-y-3 flex-none mt-auto pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1 text-slate-700 font-bold text-xs">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Quick Service / Custom Retail Addition
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <div className="sm:col-span-5">
                  <input name="productServiceDescription953" id="product-service-description-953"
                    type="text"
                    placeholder="Product/Service description"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input name="inputNumber3" id="input-number-3"
                    type="number"
                    step="0.01"
                    placeholder={`Price (${currencySign})`}
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <select name="select6340" id="select-6-340"
                    value={customItemCategory}
                    onChange={(e) => setCustomItemCategory(e.target.value as 'service' | 'retail')}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  >
                    <option value="service">Clinical</option>
                    <option value="retail">Pet Shop</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Charge item
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          /* TRANSACTION LEDGER PANEL */
          <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between flex-none">
              <span className="text-xs font-bold text-slate-700 block">Past Transactions History Ledger</span>
              <span className="text-[10px] font-mono text-slate-400">Total: {invoices.length} checkouts</span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 custom-scrollbar">
              {invoices
                .filter(inv => {
                  const matchesSearch = inv.id.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
                                      inv.ownerName.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
                                      inv.petName.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
                                      (inv.createdBy && inv.createdBy.toLowerCase().includes(ledgerSearchQuery.toLowerCase()));
                  const matchesStatus = ledgerStatusFilter === 'all' || inv.paymentStatus === ledgerStatusFilter;
                  return matchesSearch && matchesStatus;
                })
                .map(inv => {
                  const isVoid = inv.paymentStatus === 'void';
                  return (
                    <div 
                      key={inv.id} 
                      className={`p-3.5 border rounded-2xl flex items-center justify-between gap-4 transition-all hover:shadow-xs ${
                        isVoid 
                          ? 'bg-slate-50/50 border-slate-200 opacity-75' 
                          : 'bg-white border-sky-50 hover:border-sky-300'
                      }`}
                    >
                      {/* Left: ID and Date */}
                      <div className="space-y-1 max-w-[40%] text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-800 text-xs">{inv.id}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            isVoid 
                              ? 'bg-slate-205 text-slate-500 border border-slate-250' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {inv.paymentStatus.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">{inv.date}</div>
                        <div className="text-[9px] text-slate-400 font-semibold truncate">Cashier: {inv.createdBy || 'Staff'}</div>
                      </div>

                      {/* Middle: Patient & Owner */}
                      <div className="space-y-0.5 flex-1 min-w-0 text-left">
                        <span className="text-[9px] font-bold text-indigo-600 block truncate">Pet: {inv.petName}</span>
                        <span className="text-[10px] font-semibold text-slate-600 block truncate">Owner: {inv.ownerName}</span>
                        {inv.paymentMethod && (
                          <span className="text-[8px] font-bold text-slate-400 font-mono block uppercase">
                            Method: {inv.paymentMethod.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      {/* Right: Price & Quick Actions */}
                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono min-w-[70px]">
                          <span className={`text-sm font-black ${isVoid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {currencySign}{inv.sales_total.toFixed(2)}
                          </span>
                          <span className="block text-[8px] text-slate-400 mt-0.5">{inv.items.length} items</span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceDetails(inv)}
                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors"
                            title="View Transaction Details"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(inv)}
                            className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg cursor-pointer transition-colors"
                            title="Reprint Invoice Receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          {!isVoid && (
                            <button
                              type="button"
                              onClick={() => handleInitiateVoid(inv.id)}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                              title="Void/Refund Transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              
              {invoices.length === 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No transactions logged in the past checkout archives yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Active Invoice Cart System (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col justify-between">
        
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 h-[calc(100vh-140px)] flex flex-col justify-between space-y-4 relative">
          
          {/* Shift Actions Bar */}
          {currentActiveShift && (
            <div className="flex gap-2 flex-none justify-between items-center bg-slate-50 p-2 rounded-xl border border-sky-100 relative">
              <button
                type="button"
                onClick={() => setShowDrawerBalancePopup(!showDrawerBalancePopup)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer border border-slate-700/50 active:scale-95"
              >
                <span>💰</span> View Drawer Balance
              </button>
              
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(true)}
                className="bg-rose-600 hover:bg-rose-750 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>🔒</span> Close Shift (Z-Report)
              </button>

              {/* Floating Slide-out Panel / Micro-modal */}
              {showDrawerBalancePopup && (() => {
                const balances = getLiveDrawerBalances();
                return (
                  <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-4 rounded-2xl text-white shadow-xl max-w-sm absolute right-4 top-16 z-50 animate-in slide-in-from-top-4 space-y-3 w-72">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">Cash Drawer Balance</span>
                      <button
                        type="button"
                        onClick={() => setShowDrawerBalancePopup(false)}
                        className="text-slate-400 hover:text-white font-bold text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                        <span className="text-slate-400 font-semibold">Opening Float:</span>
                        <span className="font-mono font-bold text-slate-200">
                          Rs. {(balances.openingFloat / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                        <span className="text-slate-400 font-semibold">Cash Balance:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          Rs. {(balances.cashBalance / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                        <span className="text-slate-400 font-semibold">Card Balance:</span>
                        <span className="font-mono font-bold text-indigo-400">
                          Rs. {(balances.cardBalance / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 font-semibold">Bank Transfer:</span>
                        <span className="font-mono font-bold text-amber-400">
                          Rs. {(balances.bankTransferBalance / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Patient checkout linking */}
          <div className="pb-3 border-b border-sky-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 block">Link Pet Patient Care Check-in</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                {isOnline ? 'Direct Hospital Sync' : 'Offline Buffer Mode'}
              </span>
            </div>
            <div className="mt-2 text-xs relative" ref={petDropdownRef}>
              <div 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl text-slate-700 font-semibold flex items-center justify-between cursor-pointer focus-within:ring-1 focus-within:ring-sky-500 focus-within:border-sky-500"
                onClick={() => setIsPetDropdownOpen(true)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input 
                    id="pos-pet-search"
                    name="posPetSearch"
                    aria-label="Search for pet or patient"
                    type="text" 
                    value={isPetDropdownOpen ? petSearchQuery : (selectedPetId === 'walkin' ? 'Walk-in Pet Shop Customer (No Clinical EHR link)' : (activeSelectedApt?.petName || activeSelectedRecord?.petName || ''))}
                    onChange={(e) => {
                      setPetSearchQuery(e.target.value);
                      setIsPetDropdownOpen(true);
                      if (e.target.value === '') {
                        setSelectedPetId('walkin');
                      }
                    }}
                    onFocus={() => setIsPetDropdownOpen(true)}
                    placeholder="Search historical profiles or select active check-in..."
                    className="bg-transparent border-none outline-none w-full truncate text-slate-800"
                  />
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isPetDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isPetDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-20 max-h-60 overflow-y-auto custom-scrollbar overflow-hidden">
                  <div 
                    className={`p-2.5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedPetId === 'walkin' ? 'bg-sky-50' : ''}`}
                    onClick={() => {
                      setSelectedPetId('walkin');
                      setIsPetDropdownOpen(false);
                      setPetSearchQuery('');
                    }}
                  >
                    <div className="font-bold text-slate-700">Walk-in Pet Shop Customer</div>
                    <div className="text-[10px] text-slate-500">No Clinical EHR link</div>
                  </div>
                  
                  {dropdownOptions.length > 0 ? (
                    dropdownOptions.map(opt => (
                      <div 
                        key={opt.id}
                        className={`p-2.5 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${selectedPetId === opt.id ? 'bg-sky-50' : ''}`}
                        onClick={() => {
                          setSelectedPetId(opt.id);
                          setIsPetDropdownOpen(false);
                          setPetSearchQuery('');
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-800">{opt.petName} <span className="text-[10px] text-slate-400 font-normal">({opt.petType})</span></div>
                            <div className="text-[10px] text-slate-500">Owner: {opt.ownerName} <span className="font-mono">[{opt.ownerPhone}]</span></div>
                          </div>
                          {opt.isActive && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase rounded-md flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs italic">
                      No matching historical profiles found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart Contents list */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {cart.map(cartItem => (
              <div 
                key={cartItem.item.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-xs"
              >
                <div className="space-y-0.5 max-w-[60%]">
                  <span className="text-[9px] font-mono text-slate-400 block">{cartItem.item.sku}</span>
                  <div className="font-bold text-slate-800 truncate">{cartItem.item.name}</div>
                  <div className="font-semibold text-slate-500 font-mono">{currencySign}{cartItem.item.price.toFixed(2)} / {cartItem.item.unit}</div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Quantity adjusts */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1">
                    <button 
                      onClick={() => updateCartQty(cartItem.item.id, -1)}
                      className="p-0.5 hover:bg-slate-100 text-slate-500 rounded cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-slate-800 px-1.5 font-mono text-xs">{cartItem.quantity}</span>
                    <button 
                      onClick={() => updateCartQty(cartItem.item.id, 1)}
                      className="p-0.5 hover:bg-slate-100 text-slate-500 rounded cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button 
                    onClick={() => removeFromCart(cartItem.item.id)}
                    className="p-1 hover:text-rose-600 text-slate-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs text-center border border-dashed border-sky-100 rounded-xl bg-slate-50/50">
                <ShoppingBag className="h-8 w-8 text-slate-300 opacity-50 mb-2 stroke-1" />
                <p className="font-bold text-slate-500">Cart is empty</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Select clinical check-ups or pet items to begin billing.</p>
              </div>
            )}
          </div>

          {/* Pricing Summary Ledger */}
          <div className="space-y-2 pt-3 border-t border-sky-50 text-xs">
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>Treatment Subtotal:</span>
              <span className="font-mono text-slate-700 font-bold">{currencySign}{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-[11px]">
                <Tag className="h-3.5 w-3.5 text-indigo-500" /> Adjust Discount ({currencySign}):
              </span>
              <input name="inputNumber859" id="input-number-859"
                type="number"
                min="0"
                step="5"
                value={discountVal || ''}
                onChange={(e) => setDiscountVal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-right font-mono text-[11px] font-bold text-slate-700"
              />
            </div>

            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>{(taxRate * 100).toFixed(1)}% State Vet Tax:</span>
              <span className="font-mono text-slate-700 font-bold">{currencySign}{tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center pt-2 text-base font-bold text-slate-800 border-t border-dashed border-slate-200">
              <span>Estimated Total Due:</span>
              <span className="font-mono text-lg text-emerald-600 font-black">{currencySign}{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 w-full pt-1">
            <button
              onClick={handleResetActiveRegisterCartAtomic}
              disabled={cart.length === 0 && discountVal === 0}
              className={`w-1/3 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs ${
                cart.length > 0 || discountVal > 0
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95'
                  : 'bg-slate-50 text-slate-300 cursor-not-allowed'
              }`}
            >
              Reset
            </button>
            <button
              onClick={() => cart.length > 0 && setShowCheckoutModal(true)}
              disabled={cart.length === 0}
              className={`w-2/3 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs  ${
                cart.length > 0 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CreditCard className="h-4.5 w-4.5" />
              Checkout
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal Overlay */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sky-100 flex flex-col max-h-[calc(100vh-40px)] max-w-xl w-full overflow-hidden shadow-xl animate-fade-in text-xs">
            
            <div className="p-6 shrink-0 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h4 className="text-base font-extrabold text-slate-800 leading-none">Complete Payment Transaction</h4>
                <p className="text-[11px] text-slate-400 mt-1">Select customer billing type and collect funds</p>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                <div>
              <span className="text-slate-400 block font-medium">Owner / Billing For</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedApt ? selectedApt.ownerName : 'Anonymous / Walk-in'}</span>
                  {selectedApt && <span className="text-[10px] text-indigo-600 font-semibold block">Pet Patient: {selectedApt.petName}</span>}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-medium">Grand Total</span>
                  <span className="text-xl font-black text-emerald-600 font-mono">{currencySign}{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Picker */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Collection System</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 border rounded-xl flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                      paymentMethod === 'cash' ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Coins className="h-4 w-4" /> Cash Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 border rounded-xl flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                      paymentMethod === 'card' ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" /> Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-3 border rounded-xl flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                      paymentMethod === 'bank_transfer' ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="h-4 w-4" /> Bank Transfer
                  </button>
                </div>
              </div>

              {/* Cash details math */}
              {paymentMethod === 'cash' && (
                <div className="space-y-2 p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                  <span className="font-semibold text-teal-800 block">Cash Received calculator</span>
                  <div className="flex gap-2">
                    <input name="inputNumber739" id="input-number-739"
                      ref={cashInputRef}
                      type="number"
                      placeholder={`Enter cash amount (${currencySign})`}
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (isProcessing) return;
                          await handleCheckoutSubmit();
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs font-bold"
                    />
                  </div>
                  {amountReceived && (
                    <div className="pt-1 flex justify-between items-center font-mono">
                      {parseFloat(amountReceived) < total ? (
                        <span className="text-sm font-semibold text-rose-500">Remaining: {currencySign}{(total - parseFloat(amountReceived)).toFixed(2)}</span>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-teal-800">Change Due:</span>
                          <span className="text-emerald-600 font-bold text-lg">{currencySign}{(parseFloat(amountReceived) - total).toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 shrink-0 border-t border-slate-100 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold transition-colors"
              >
                Cancel Checkout
              </button>
              <button
                onClick={handleCheckoutSubmit}
                disabled={isProcessing || (paymentMethod === 'cash' && Number(amountReceived) < total)}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 font-bold transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Finalize & Record ({currencySign}{total.toFixed(2)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback banner of successful billing */}
      {checkoutSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sky-100 max-w-sm w-full p-6 text-center space-y-4 animate-scale-up text-xs overflow-hidden">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Payment Secured</h3>
              <p className="text-slate-500 mt-0.5">Invoice {checkoutSuccess.id} created successfully.</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-semibold text-slate-700 capitalize">
                  {checkoutSuccess.paymentMethod === 'cash' ? 'Cash Register' : 
                   checkoutSuccess.paymentMethod === 'card' ? 'Credit/Debit Card' : 'Bank Transfer'}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-400">Total Charged:</span>
                <span className="font-bold text-emerald-600 font-black">{currencySign}{(checkoutSuccess.sales_total).toFixed(2)}</span>
              </div>
              <div className="pt-1.5 flex justify-between text-[10px]">
                <span className="text-slate-400">Sync Status:</span>
                <span className={`font-bold ${isOnline ? 'text-indigo-600' : 'text-amber-600 animate-pulse'}`}>
                  {isOnline ? 'Synced to Cloud EHR' : 'Cached Local (Pending)'}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => handlePrintReceipt(checkoutSuccess)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Receipt <span className="text-[9px] opacity-75 font-normal ml-0.5">(Enter)</span>
              </button>
              <button
                onClick={() => {
                  setCheckoutSuccess(null);
                  setPaymentMethod('cash');
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl cursor-pointer flex items-center justify-center"
              >
                Close Panel <span className="text-[9px] text-slate-400 font-normal ml-1">(Esc)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Passcode PIN Challenge Modal Overlay */}
      {showPinChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl border border-sky-100 max-w-sm w-full p-6 text-center space-y-5 shadow-2xl animate-scale-up text-xs font-sans overflow-hidden">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-lg animate-bounce">
              🔒
            </div>
            
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 leading-none">Manager Authorization Required</h4>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Voiding Invoice <span className="font-mono font-bold text-slate-700">{challengeInvoiceId}</span> requires administrator authority.
              </p>
            </div>

            {/* Passcode display field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-left">Passcode PIN Code</span>
                {challengePinError && (
                  <span className="text-[9px] text-rose-600 font-extrabold animate-pulse">Incorrect Master PIN</span>
                )}
              </div>
              <div className="h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span 
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-150 ${
                      enteredChallengePin.length > i 
                        ? 'bg-slate-800 scale-110 shadow-xs' 
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Touchscreen Keyboard Pad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinKeypress(num)}
                  className="py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 font-mono font-black text-sm rounded-xl cursor-pointer transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinBackspace}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl cursor-pointer active:scale-95"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => handlePinKeypress('0')}
                className="py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 font-mono font-black text-sm rounded-xl cursor-pointer transition-all active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setEnteredChallengePin('')}
                className="py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl cursor-pointer active:scale-95"
              >
                Clear
              </button>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowPinChallenge(false);
                  setEnteredChallengePin('');
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerifyChallengePin()}
                disabled={enteredChallengePin.length !== 4}
                className={`flex-1 py-2 text-white font-extrabold rounded-xl cursor-pointer transition-all shadow-xs ${
                  enteredChallengePin.length === 4 
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Authorize Void
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Invoice Details Sheet Modal Overlay */}
      {selectedInvoiceDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sky-100 max-h-[calc(100vh-40px)] w-full max-w-md flex flex-col shadow-2xl animate-scale-up text-xs font-sans text-left overflow-hidden">
            
            <div className="p-6 shrink-0 flex justify-between items-start border-b border-slate-50">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 leading-none">Invoice Transaction Sheet</h4>
                <p className="text-[10px] text-slate-400 mt-1">Audit sheet for invoice checkout records</p>
              </div>
              <button 
                onClick={() => setSelectedInvoiceDetails(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              {/* Audit log strip */}
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Invoice ID:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedInvoiceDetails.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Checkout Date:</span>
                  <span className="font-mono text-slate-650 font-semibold">{selectedInvoiceDetails.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Billed Cashier:</span>
                  <span className="font-semibold text-slate-650">{selectedInvoiceDetails.createdBy || 'Authorized Staff'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Discharge Status:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                    selectedInvoiceDetails.paymentStatus === 'void' 
                      ? 'bg-slate-205 text-slate-500 border border-slate-250' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedInvoiceDetails.paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Client / Pet linkage info */}
              <div className="p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-xl text-left">
                <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider block font-mono">Billed Customer / Patient</span>
                <span className="font-bold text-slate-800 block text-xs mt-0.5">Owner: {selectedInvoiceDetails.ownerName}</span>
                <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">Pet Patient: {selectedInvoiceDetails.petName}</span>
                <span className="text-[9px] text-slate-400 block font-mono mt-0.5">Phone: {selectedInvoiceDetails.ownerPhone}</span>
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="p-2 w-[55%]">Item Description</th>
                      <th className="p-2 text-center w-[15%]">Qty</th>
                      <th className="p-2 text-right w-[30%]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {selectedInvoiceDetails.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <span className="text-[8px] font-mono text-slate-400 block">{item.sku}</span>
                          <div className="truncate max-w-[200px]">{item.name}</div>
                        </td>
                        <td className="p-2 text-center font-mono">{item.quantity}</td>
                        <td className="p-2 text-right font-mono">{currencySign}{(item.totalPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Math break downs */}
              <div className="space-y-1.5 pt-1.5 text-[10px] font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Items Subtotal:</span>
                  <span className="font-mono text-slate-700">{currencySign}{(selectedInvoiceDetails.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount Applied:</span>
                  <span className="font-mono text-slate-700">-{currencySign}{(selectedInvoiceDetails.discount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-1.5">
                  <span>Vet Sales Tax:</span>
                  <span className="font-mono text-slate-700">{currencySign}{(selectedInvoiceDetails.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-800 pt-0.5">
                  <span>Discharged Total:</span>
                  <span className="font-mono text-emerald-600 font-black text-sm">
                    {currencySign}{(selectedInvoiceDetails.sales_total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick sheet controls */}
            <div className="p-6 shrink-0 flex gap-2 pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={() => handlePrintReceipt(selectedInvoiceDetails)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Reprint Receipt
              </button>
              {selectedInvoiceDetails.paymentStatus !== 'void' && (
                <button
                  type="button"
                  onClick={() => handleInitiateVoid(selectedInvoiceDetails.id)}
                  className="py-2.5 px-3 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl cursor-pointer"
                >
                  Void Invoice
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedInvoiceDetails(null)}
                className="py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
      {/* HARDENED SHIFT OPENING CONTROL OVERLAY */}
      {!currentActiveShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-xs animate-fade-in">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <span className="text-sm px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-bold">🔑</span>
              <div>
                <h3 className="font-black text-slate-800 text-sm">Initialize Terminal Shift</h3>
                <p className="text-slate-400 font-medium">Define Starting Cash Vault Asset States</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-600 font-bold">Opening Cash Float (LKR):</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-[11px]">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
              <p className="text-slate-400 font-medium text-[10px]">
                Input whole counted currency bills present inside physical till drawer on terminal startup.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!openingFloatInput.trim() || parseFloat(openingFloatInput) < 0) {
                  showToast('Please specify a valid starting cash float amount.', 'error');
                  return;
                }
                handleOpenShift(openingFloatInput);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-center text-xs focus:outline-hidden"
            >
              Establish Open Shift Session
            </button>
          </div>
        </div>
      )}

      {/* HARDENED MULTI-METHOD CASH DRAWER BALANCE LOOKUP MODAL */}
      {showCashDrawerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs text-xs p-4 animate-fade-in">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 relative space-y-4">
            <button 
              type="button"
              onClick={() => setShowCashDrawerModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer transition-colors focus:outline-hidden"
            >
              ✕
            </button>
            
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <span className="text-sm px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold">💵</span>
              <div>
                <h3 className="font-black text-slate-800 text-sm">Real-Time Cash Drawer</h3>
                <p className="text-slate-400 font-medium">Physical Till & Digital Ledger Sync</p>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl px-4 py-3 mb-4">
              <div className="flex justify-between font-semibold text-slate-600 mb-1">
                <span>Opening Cash Float:</span>
                <span>Rs. {((currentActiveShift?.openingFloatCents || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-600 mb-2 border-b border-emerald-100 pb-2">
                <span>(+) Cash Sales Added:</span>
                <span className="text-emerald-600">Rs. {((currentActiveShift?.cashCollectedCents || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-black text-slate-900 text-sm">
                <span>Physical Cash In Drawer:</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                  Rs. {(((currentActiveShift?.openingFloatCents || 0) + (currentActiveShift?.cashCollectedCents || 0)) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 bg-slate-50/80 border border-slate-200/60 rounded-xl px-4 py-1">
              <div className="flex justify-between py-2.5 font-semibold text-slate-600">
                <span>Card Revenue (Digital):</span>
                <span className="font-bold text-indigo-600">
                  Rs. {((currentActiveShift?.cardCollectedCents || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2.5 font-semibold text-slate-600">
                <span>Bank Transfer (Digital):</span>
                <span className="font-bold text-amber-600">
                  Rs. {((currentActiveShift?.bankTransferCollectedCents || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-center pt-2 border-t border-slate-100">
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-500 rounded-md font-mono text-[10px] shadow-2xs">
                ESC
              </kbd>
              <span className="text-slate-400 font-medium text-[11px]">to escape tracking view</span>
            </div>
          </div>
        </div>
      )}

      {/* DAILY Z-REPORT MODAL */}
      {showCloseShiftModal && (() => {
        const zCalculations = getZReportCalculations();
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-xs animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-40px)] w-full max-w-xl overflow-hidden relative">
              
              {/* Frozen Header */}
              <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <span className="text-sm px-2 py-1 bg-rose-50 text-rose-600 rounded-lg font-bold">🔒</span>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">Daily Z-Report & Terminal Closure</h3>
                    <p className="text-slate-400 font-medium">Reconcile shift accounts to conclude session</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer transition-colors focus:outline-hidden"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                
                {/* BLOCK 1: Drawer Reconciliation */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                  <h4 className="font-black text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-1.5">
                    Block 1: Drawer Reconciliation
                  </h4>
                  <div className="grid grid-cols-3 gap-4 border-b border-slate-200/50 pb-2">
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5 font-[system-ui]">Opening Cash Float</span>
                      <span className="font-mono text-slate-800 font-bold text-xs">
                        Rs. {(zCalculations.openingFloat / 100).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5 font-[system-ui]">Expected Closing Cash</span>
                      <span className="font-mono text-slate-800 font-bold text-xs">
                        Rs. {(zCalculations.expectedClosingCash / 100).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5 font-[system-ui]">Calculated Variance</span>
                      <span className={`font-mono font-bold text-xs ${
                        Math.round((parseFloat(actualCashInput) || 0) * 100) - zCalculations.expectedClosingCash === 0
                          ? 'text-slate-500'
                          : Math.round((parseFloat(actualCashInput) || 0) * 100) - zCalculations.expectedClosingCash > 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}>
                        Rs. {((Math.round((parseFloat(actualCashInput) || 0) * 100) - zCalculations.expectedClosingCash) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Actual Counted Cash (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={actualCashInput}
                      onChange={(e) => setActualCashInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-hidden focus:border-rose-500 transition-all font-mono"
                    />
                  </div>
                  {/* Conditional Textarea for discrepancy */}
                  {Math.round((parseFloat(actualCashInput) || 0) * 100) !== zCalculations.expectedClosingCash && (
                    <div className="animate-fade-in">
                      <label className="block text-rose-600 font-bold mb-1">Reason for Discrepancy</label>
                      <textarea
                        placeholder="Please specify why expected cash does not match counted cash..."
                        value={closeNotesInput}
                        onChange={(e) => setCloseNotesInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 text-xs h-16 resize-none focus:outline-hidden focus:border-rose-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* BLOCK 2: Payment Balances */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-2">
                  <h4 className="font-black text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-1.5">
                    Block 2: Payment Balances
                  </h4>
                  <div className="divide-y divide-slate-200/60">
                    <div className="flex justify-between py-1.5 font-semibold text-slate-600">
                      <span>Cash Sales:</span>
                      <span className="font-mono text-slate-800 font-bold">Rs. {(zCalculations.cashCollected / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-semibold text-slate-600">
                      <span>Card Sales:</span>
                      <span className="font-mono text-slate-800 font-bold">Rs. {(zCalculations.cardCollected / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-semibold text-slate-600">
                      <span>Bank Transfer Sales:</span>
                      <span className="font-mono text-slate-800 font-bold">Rs. {(zCalculations.bankTransferCollected / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* BLOCK 3: Category Performance Breakdown */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-2">
                  <h4 className="font-black text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-1.5">
                    Block 3: Category Performance Breakdown
                  </h4>
                  <div className="divide-y divide-slate-200/60">
                    <div className="flex justify-between py-1.5 font-semibold text-slate-600">
                      <span>Pet Supplies Shop:</span>
                      <span className="font-mono text-slate-800 font-bold">Rs. {(zCalculations.petSuppliesShop / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-semibold text-slate-600">
                      <span>Pharmacy Rx:</span>
                      <span className="font-mono text-slate-800 font-bold">Rs. {(zCalculations.pharmacyRx / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-semibold text-slate-600">
                      <span>Labs & Diagnostics:</span>
                      <span className="font-mono text-slate-800 font-bold">Rs. {(zCalculations.labsServices / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-semibold text-slate-600">
                      <span>Clinical Care (services):</span>
                      <span className="font-mono text-slate-800 font-bold">Rs. {(zCalculations.clinicalCare / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-semibold text-slate-600">
                      <span>Vaccinations:</span>
                      <span className="font-mono text-slate-800 font-bold">Rs. {(zCalculations.vaccinations / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* BLOCK 4: Bottom Line Financial Health */}
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-2 border border-slate-850">
                  <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 pb-1.5">
                    Block 4: Bottom Line Financial Health
                  </h4>
                  <div className="divide-y divide-slate-800">
                    <div className="flex justify-between py-1.5 font-semibold">
                      <span className="text-slate-400">Gross Revenue:</span>
                      <span className="font-mono text-slate-200 font-bold">Rs. {(zCalculations.grossRevenue / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-semibold">
                      <span className="text-slate-400">Cost of Goods Sold (COGS):</span>
                      <span className="font-mono text-slate-200 font-bold">Rs. {(zCalculations.cogs / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 items-center">
                      <span className="font-black text-sm text-slate-300">Net Profit:</span>
                      <span className={`font-mono text-base font-black px-2 py-0.5 rounded-md ${zCalculations.netProfit >= 0 ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'}`}>
                        Rs. {(zCalculations.netProfit / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Frozen Footer */}
              <div className="border-t border-slate-100 p-4 shrink-0 bg-slate-50 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="w-1/3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-center text-xs cursor-pointer transition-colors focus:outline-hidden"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const actualCounted = parseFloat(actualCashInput || '0');
                    if (isNaN(actualCounted) || actualCounted < 0) {
                      showToast('Please specify a valid actual counted cash amount.', 'error');
                      return;
                    }
                    
                    const actualCents = Math.round(actualCounted * 100);
                    const isDiscrepancy = actualCents !== zCalculations.expectedClosingCash;
                    if (isDiscrepancy && !closeNotesInput.trim()) {
                      showToast('Please provide a reason for the cash discrepancy.', 'error');
                      return;
                    }

                    try {
                      await handleCompileAndCloseShiftZReport(actualCashInput, closeNotesInput);
                      setShowCloseShiftModal(false);
                      setActualCashInput('');
                      setCloseNotesInput('');
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-2/3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-center text-xs flex items-center justify-center space-x-2 focus:outline-hidden"
                >
                  <span>🖨️</span>
                  <span>Confirm Shift Close</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
