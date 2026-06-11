# Ceylon Pets POS: Financial & Accounting Formulas

This document serves as the official accounting guide and reference sheet for Ceylon Pets POS shift-based revenue reconciliation.

---

## Core Financial Metrics

### 1. Gross Sales
The total revenue realized during the active shift. Only finalized transactions are accounted for.
$$\text{Gross Sales} = \sum (\text{sales\_total}) \quad \text{where} \quad \text{payment\_status} = \text{'paid'} \ \text{and} \ \text{shift\_id} = \text{active\_shift\_id}$$

### 2. Cost of Goods Sold (COGS)
The cumulative acquisition cost of inventory items sold during the active shift.
$$\text{Total COGS} = \sum (\text{cogs}) \quad \text{where} \quad \text{payment\_status} = \text{'paid'} \ \text{and} \ \text{shift\_id} = \text{active\_shift\_id}$$

### 3. Net Profit
The net realized gain after subtracting acquisition cost from total sales.
$$\text{Net Profit} = \text{Gross Sales} - \text{Total COGS} = \sum (\text{profit}) \quad \text{where} \quad \text{payment\_status} = \text{'paid'} \ \text{and} \ \text{shift\_id} = \text{active\_shift\_id}$$

---

## Tender Reconciliation Channels

All shift metrics are segmented by tender channels according to their specified payment methods:

* **Cash Channel**: Total of sales where `payment_method = 'cash'`
* **Card Channel**: Total of sales where `payment_method = 'card'`
* **Bank Transfer Channel**: Total of sales where `payment_method = 'bank_transfer'`

---

## Realized vs. Unrealized Revenue
* Invoices set to `void` are explicitly excluded from all Shift Calculations.
* Invoices set to `unpaid` are treated as accounts receivable/unrealized and are **not** mixed into shift metrics.

---

## 4. POS Billing Breakdown & Category Share Calculations

To reconcile the exact revenue share of each clinical and retail department during a shift:

### Category Revenue ($Rev_{cat}$)
The sum of item totals belonging to a specific category (e.g. `retail`, `prescription`, `lab_service`, `service`, `vaccine`) across paid invoices of the active shift:
$$Rev_{cat} = \sum (\text{item.totalPrice}) \quad \text{where} \quad \text{item.category} = cat \ \text{and} \ \text{payment\_status} = \text{'paid'} \ \text{and} \ \text{shift\_id} = \text{active\_shift\_id}$$

### Category Share Percentage ($Share_{cat}$)
The proportion of total shift sales attributed to a specific category:
$$Share_{cat} = \left( \frac{Rev_{cat}}{\text{Gross Sales}} \right) \times 100$$

