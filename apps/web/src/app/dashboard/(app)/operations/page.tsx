'use client'

import { useState, useEffect } from 'react'

interface Employee {
  id: string
  firstName: string
  lastName: string
  role: string
  department?: string
  email?: string
  hourlyRate?: number
  isActive: boolean
}

interface InventoryItem {
  id: string
  name: string
  sku?: string
  category?: string
  quantity: number
  reorderPoint: number
  unitCost?: number
  location?: string
}

interface Vendor {
  id: string
  name: string
  email?: string
  category?: string
  phone?: string
}

const DEMO_EMPLOYEES: Employee[] = [
  { id: '1', firstName: 'Alice', lastName: 'Johnson', role: 'Manager', department: 'Operations', email: 'alice@business.com', hourlyRate: 45, isActive: true },
  { id: '2', firstName: 'Bob', lastName: 'Smith', role: 'Technician', department: 'Service', email: 'bob@business.com', hourlyRate: 28, isActive: true },
  { id: '3', firstName: 'Carol', lastName: 'White', role: 'Admin', department: 'Office', email: 'carol@business.com', hourlyRate: 22, isActive: true },
  { id: '4', firstName: 'Dan', lastName: 'Brown', role: 'Sales Rep', department: 'Sales', email: 'dan@business.com', hourlyRate: 20, isActive: false },
]

const DEMO_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Office Paper A4', sku: 'OFC-001', category: 'Office Supplies', quantity: 3, reorderPoint: 10, unitCost: 12.99, location: 'Storage Room A' },
  { id: '2', name: 'Laptop Stand', sku: 'TECH-045', category: 'Electronics', quantity: 15, reorderPoint: 5, unitCost: 34.99, location: 'Tech Closet' },
  { id: '3', name: 'Hand Sanitizer', sku: 'HYG-009', category: 'Hygiene', quantity: 2, reorderPoint: 8, unitCost: 5.49, location: 'Reception' },
  { id: '4', name: 'Coffee Pods', sku: 'BRK-022', category: 'Breakroom', quantity: 24, reorderPoint: 20, unitCost: 0.89, location: 'Break Room' },
]

const DEMO_VENDORS: Vendor[] = [
  { id: '1', name: 'Office Depot', email: 'orders@officedepot.com', category: 'Office Supplies', phone: '555-0101' },
  { id: '2', name: 'TechParts Inc.', email: 'sales@techparts.com', category: 'Electronics', phone: '555-0202' },
  { id: '3', name: 'CleanSupply Co.', email: 'info@cleansupply.com', category: 'Cleaning', phone: '555-0303' },
]

type Tab = 'employees' | 'inventory' | 'vendors'

export default function OperationsPage() {
  const [tab, setTab] = useState<Tab>('employees')
  const [employees, setEmployees] = useState<Employee[]>(DEMO_EMPLOYEES)
  const [inventory, setInventory] = useState<InventoryItem[]>(DEMO_INVENTORY)
  const [vendors, setVendors] = useState<Vendor[]>(DEMO_VENDORS)

  useEffect(() => {
    Promise.all([
      fetch('/api/operations/employees').then(r => r.json()).catch(() => null),
      fetch('/api/operations/inventory').then(r => r.json()).catch(() => null),
      fetch('/api/operations/vendors').then(r => r.json()).catch(() => null),
    ]).then(([emp, inv, ven]) => {
      if (emp?.employees?.length) setEmployees(emp.employees)
      if (inv?.items?.length) setInventory(inv.items)
      if (ven?.vendors?.length) setVendors(ven.vendors)
    })
  }, [])

  const lowStockItems = inventory.filter(i => i.quantity <= i.reorderPoint)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations</h1>
          <p className="text-gray-400 text-sm mt-1">Employees, inventory, and vendor management</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{employees.filter(e => e.isActive).length}</p>
          <p className="text-xs text-gray-400 mt-1">Active Employees</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">{inventory.length}</p>
          <p className="text-xs text-gray-400 mt-1">Inventory Items</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${lowStockItems.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
          <p className={`text-3xl font-bold ${lowStockItems.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{lowStockItems.length}</p>
          <p className="text-xs text-gray-400 mt-1">Low Stock Alerts</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{vendors.length}</p>
          <p className="text-xs text-gray-400 mt-1">Active Vendors</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        {(['employees', 'inventory', 'vendors'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Employees tab */}
      {tab === 'employees' && (
        <div className="space-y-3">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-600/30 rounded-full flex items-center justify-center text-purple-300 font-bold">
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
                <div>
                  <p className="text-white font-medium">{emp.firstName} {emp.lastName}</p>
                  <p className="text-sm text-gray-400">{emp.role} · {emp.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {emp.hourlyRate && <span className="text-sm text-gray-400">${emp.hourlyRate}/hr</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${emp.isActive ? 'bg-green-400/10 text-green-400' : 'bg-gray-400/10 text-gray-400'}`}>
                  {emp.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory tab */}
      {tab === 'inventory' && (
        <div className="space-y-3">
          {inventory.map(item => {
            const isLow = item.quantity <= item.reorderPoint
            return (
              <div key={item.id} className={`border rounded-xl p-4 flex items-center justify-between ${isLow ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{item.name}</p>
                    {isLow && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Low Stock</span>}
                  </div>
                  <p className="text-sm text-gray-400">{item.sku} · {item.category} · {item.location}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>{item.quantity}</p>
                  <p className="text-xs text-gray-500">min {item.reorderPoint}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Vendors tab */}
      {tab === 'vendors' && (
        <div className="space-y-3">
          {vendors.map(vendor => (
            <div key={vendor.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{vendor.name}</p>
                <p className="text-sm text-gray-400">{vendor.category} · {vendor.email}</p>
              </div>
              <span className="text-sm text-gray-400">{vendor.phone}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
