import React, { useState, useMemo, useRef } from "react";
import { useAccounts } from "../context/AccountsContext";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  MapPin,
  FolderOpen,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Upload,
  AlertTriangle,
  X,
  List,
  Users,
  FileText,
  Trash2,
  CheckSquare,
  Square,
  Check,
} from "lucide-react";
import {
  Category,
  Account,
  NewAccount,
  BulkImportMode,
  CategoryType,
} from "../types";

type ColumnType = "NAME" | "AMOUNT" | "DATE" | "NOTE" | "IGNORE";

const Accounts: React.FC = () => {
  const {
    locations,
    categories,
    accounts,
    addLocation,
    addCategory,
    addAccount,
    addBulkAccounts,
    addBulkTransactions,
    addTransaction,
    deleteTransaction,
    deleteCategory,
    deleteBulkAccounts,
  } = useAccounts();
  const navigate = useNavigate();

  const [activeLocationId, setActiveLocationId] = useState<string>(
    locations[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");

  // View States
  const [activeViewCategoryId, setActiveViewCategoryId] = useState<
    string | null
  >(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
    new Set()
  );

  // Modal States
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // Temporary Form States
  const [newLocationName, setNewLocationName] = useState("");

  // New Category Form
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] =
    useState<CategoryType>("PEOPLE");

  const [selectedCategoryForAccount, setSelectedCategoryForAccount] =
    useState<string>("");

  // Add Account Form
  const [newAccountMode, setNewAccountMode] = useState<"SINGLE" | "BULK">(
    "SINGLE"
  );
  const [singleAccountData, setSingleAccountData] = useState({
    name: "",
    walletBalance: 0,
    dueBalance: 0,
    joiningDate: new Date().toISOString().split("T")[0],
  });

  // Ledger Single Entry
  const [ledgerEntryData, setLedgerEntryData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "DEBIT" as "DEBIT" | "CREDIT",
  });

  // Bulk Import States
  const [bulkImportStep, setBulkImportStep] = useState<"INPUT" | "PREVIEW">(
    "INPUT"
  );
  const [bulkImportMode, setBulkImportMode] =
    useState<BulkImportMode>("ACCOUNTS");
  const [bulkTransactionType, setBulkTransactionType] = useState<
    "DEBIT" | "CREDIT"
  >("DEBIT");

  const [bulkTextData, setBulkTextData] = useState("");
  const [rawGridData, setRawGridData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived State
  const activeLocation = locations.find((l) => l.id === activeLocationId);

  // Filter Logic
  const filteredData = useMemo(() => {
    if (!searchQuery) return null; // Null means no search active

    const query = searchQuery.toLowerCase();

    // Filter accounts
    const matchedAccounts = accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(query) ||
        categories
          .find((c) => c.id === acc.categoryId)
          ?.name.toLowerCase()
          .includes(query)
    );

    return matchedAccounts;
  }, [searchQuery, accounts, categories]);

  // Statistics for Active Location
  const locationStats = useMemo(() => {
    const locAccounts = accounts.filter(
      (a) => a.locationId === activeLocationId
    );
    return locAccounts.reduce(
      (acc, curr) => ({
        totalDue: acc.totalDue + curr.dueBalance,
        totalWallet: acc.totalWallet + curr.walletBalance,
      }),
      { totalDue: 0, totalWallet: 0 }
    );
  }, [accounts, activeLocationId]);

  const netAmount = locationStats.totalDue - locationStats.totalWallet;

  const categoriesInActiveLocation = useMemo(() => {
    return categories.filter((c) => c.locationId === activeLocationId);
  }, [categories, activeLocationId]);

  // Actions
  const handleCreateLocation = () => {
    if (newLocationName.trim()) {
      addLocation(newLocationName);
      setNewLocationName("");
      setIsAddLocationOpen(false);
    }
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim() && activeLocationId) {
      addCategory(activeLocationId, newCategoryName, newCategoryType);
      setNewCategoryName("");
      setIsAddCategoryOpen(false);
      setNewCategoryType("PEOPLE"); // Reset
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (
      confirm(
        "WARNING: This will delete the Category AND ALL ACCOUNTS inside it.\n\nAre you sure you want to proceed?"
      )
    ) {
      deleteCategory(categoryId);
      setActiveViewCategoryId(null);
    }
  };

  const toggleAccountSelection = (accId: string) => {
    const newSet = new Set(selectedAccountIds);
    if (newSet.has(accId)) {
      newSet.delete(accId);
    } else {
      newSet.add(accId);
    }
    setSelectedAccountIds(newSet);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedAccountIds);
    if (ids.length === 0) return;

    if (
      confirm(`Are you sure you want to delete these ${ids.length} accounts?`)
    ) {
      deleteBulkAccounts(ids);
      setSelectedAccountIds(new Set());
      setIsSelectionMode(false);
    }
  };

  const handleAddLedgerEntry = () => {
    const category = categories.find(
      (c) => c.id === selectedCategoryForAccount
    );
    if (!category || category.type !== "LEDGER") return;

    const ledgerAccount = accounts.find((a) => a.categoryId === category.id);
    if (!ledgerAccount) return;

    if (ledgerEntryData.amount && ledgerEntryData.description) {
      addTransaction(ledgerAccount.id, {
        description: ledgerEntryData.description,
        amount: parseFloat(ledgerEntryData.amount),
        date: ledgerEntryData.date,
        type: ledgerEntryData.type,
      });
      closeAddAccountModal();
    }
  };

  const handleCreateAccount = () => {
    if (!selectedCategoryForAccount) return;
    const category = categories.find(
      (c) => c.id === selectedCategoryForAccount
    );

    if (newAccountMode === "SINGLE") {
      if (category?.type === "LEDGER") {
        handleAddLedgerEntry();
        return;
      }

      if (singleAccountData.name.trim()) {
        addAccount(
          selectedCategoryForAccount,
          activeLocationId,
          singleAccountData
        );
        closeAddAccountModal();
      }
    } else {
      // --- BULK COMMIT LOGIC ---
      // 1. Extract data based on columns
      const extractedData = rawGridData
        .map((row) => {
          const data: any = { name: "", amount: 0, date: "", note: "" };
          columnMapping.forEach((type, colIndex) => {
            const val = row[colIndex];
            if (type === "NAME") data.name = val;
            if (type === "AMOUNT") data.amount = parseFloat(val) || 0;
            if (type === "DATE") data.date = val;
            if (type === "NOTE") data.note = val;
          });
          return data;
        })
        .filter(
          (d) => d.name.trim() !== "" || d.note.trim() !== "" || d.amount > 0
        ); // Flexible filter

      if (extractedData.length > 0) {
        if (bulkImportMode === "ACCOUNTS") {
          const newAccounts: NewAccount[] = extractedData.map((d) => ({
            name: d.name,
            walletBalance: 0,
            dueBalance: d.amount,
            joiningDate: d.date || new Date().toISOString().split("T")[0],
          }));
          addBulkAccounts(
            selectedCategoryForAccount,
            activeLocationId,
            newAccounts
          );
        } else {
          // TRANSACTIONS
          // If Ledger, target the single ledger account
          let targetAccountId: string | undefined = undefined;
          if (category?.type === "LEDGER") {
            const ledgerAccount = accounts.find(
              (a) => a.categoryId === category.id
            );
            targetAccountId = ledgerAccount?.id;
          }

          addBulkTransactions(
            selectedCategoryForAccount,
            activeLocationId,
            extractedData,
            bulkTransactionType,
            targetAccountId
          );
        }
        closeAddAccountModal();
      }
    }
  };

  const openAddAccountModal = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    setSelectedCategoryForAccount(categoryId);
    setNewAccountMode("SINGLE");
    setBulkImportStep("INPUT");
    setBulkTextData("");
    setRawGridData([]);

    // Default Bulk Mode based on Category Type
    if (category?.type === "LEDGER") {
      setBulkImportMode("TRANSACTIONS");
    } else {
      setBulkImportMode("ACCOUNTS");
    }

    setIsAddAccountOpen(true);
  };

  const closeAddAccountModal = () => {
    setIsAddAccountOpen(false);
    setSingleAccountData({
      name: "",
      walletBalance: 0,
      dueBalance: 0,
      joiningDate: new Date().toISOString().split("T")[0],
    });
    setLedgerEntryData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "DEBIT",
    });
    setBulkTextData("");
    setRawGridData([]);
    setBulkImportStep("INPUT");
  };

  // CSV/Text Parsing Logic
  const parseBulkData = (text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return;

    const grid = lines.map((line) =>
      line.split(",").map((cell) => cell.trim())
    );

    // Heuristic to guess columns
    const firstRow = grid[0];
    const category = categories.find(
      (c) => c.id === selectedCategoryForAccount
    );

    const newMapping: ColumnType[] = firstRow.map((cell) => {
      if (
        cell.match(/\d{4}-\d{2}-\d{2}/) ||
        cell.toLowerCase().includes("date")
      )
        return "DATE";
      if (!isNaN(parseFloat(cell)) && cell.length < 10 && !cell.includes("-"))
        return "AMOUNT";
      return "NAME";
    });

    // Adjust for Ledger (Prefer Note/Desc over Name if Name not relevant)
    if (category?.type === "LEDGER") {
      // If we have a NAME, change it to NOTE if name isn't needed
      newMapping.forEach((m, i) => {
        if (m === "NAME") newMapping[i] = "NOTE";
      });
      // But allow user to override
    }

    setRawGridData(grid);
    setColumnMapping(newMapping);
    setBulkImportStep("PREVIEW");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseBulkData(text);
      };
      reader.readAsText(file);
    }
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newGrid = [...rawGridData];
    newGrid[rowIndex][colIndex] = value;
    setRawGridData(newGrid);
  };

  const updateColumnMapping = (index: number, type: ColumnType) => {
    const newMapping = [...columnMapping];
    newMapping[index] = type;
    setColumnMapping(newMapping);
  };

  // Check for existence
  const getAccountStatus = (name: string) => {
    return accounts.some(
      (acc) =>
        acc.categoryId === selectedCategoryForAccount &&
        acc.name.toLowerCase() === name.toLowerCase().trim()
    );
  };

  // Calculate Total
  const totalImportAmount = useMemo(() => {
    let total = 0;
    const amountColIndex = columnMapping.findIndex((c) => c === "AMOUNT");
    if (amountColIndex !== -1) {
      rawGridData.forEach((row) => {
        const val = parseFloat(row[amountColIndex]);
        if (!isNaN(val)) total += val;
      });
    }
    return total;
  }, [rawGridData, columnMapping]);

  // --- Render Helpers ---

  const AccountListItem = ({
    acc,
    locName,
    catName,
    showMeta = false,
  }: {
    acc: Account;
    locName?: string;
    catName?: string;
    showMeta?: boolean;
  }) => (
    <div
      onClick={(e) => {
        if (isSelectionMode) {
          e.stopPropagation();
          toggleAccountSelection(acc.id);
        } else {
          e.stopPropagation();
          navigate(`/accounts/${acc.id}`);
        }
      }}
      className={`p-3 cursor-pointer flex items-center justify-between group transition-colors border-b border-slate-800/50 last:border-0 
        ${
          isSelectionMode && selectedAccountIds.has(acc.id)
            ? "bg-brand-500/10"
            : "hover:bg-slate-800"
        }`}
    >
      <div className="flex items-center gap-3">
        {isSelectionMode && (
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center ${
              selectedAccountIds.has(acc.id)
                ? "bg-brand-500 border-brand-500 text-slate-900"
                : "border-slate-600"
            }`}
          >
            {selectedAccountIds.has(acc.id) && <Check size={14} />}
          </div>
        )}
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold group-hover:bg-brand-500/10 group-hover:text-brand-500 border border-slate-700">
          {acc.name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-slate-200 group-hover:text-white text-sm">
            {acc.name}
          </p>
          {showMeta ? (
            <p className="text-[10px] text-slate-500">
              {locName} &bull; {catName}
            </p>
          ) : (
            <p className="text-[10px] text-slate-500">{acc.joiningDate}</p>
          )}
        </div>
      </div>
      <div className="text-right flex flex-col gap-1 items-end">
        {acc.dueBalance > 0 && (
          <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/10">
            Due: ₹{acc.dueBalance.toLocaleString()}
          </span>
        )}
        {acc.walletBalance > 0 && (
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
            Adv: ₹{acc.walletBalance.toLocaleString()}
          </span>
        )}
        {acc.dueBalance === 0 && acc.walletBalance === 0 && (
          <span className="text-[10px] text-slate-600">-</span>
        )}
      </div>
    </div>
  );

  const AccountCard = ({ acc }: { acc: Account }) => (
    <div
      onClick={() => {
        if (isSelectionMode) toggleAccountSelection(acc.id);
        else navigate(`/accounts/${acc.id}`);
      }}
      className={`border rounded-lg p-3 cursor-pointer group transition-all shadow-sm flex flex-col h-full
        ${
          isSelectionMode && selectedAccountIds.has(acc.id)
            ? "bg-brand-500/10 border-brand-500 shadow-brand-500/20"
            : "bg-slate-900 border-slate-800 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/5"
        }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                selectedAccountIds.has(acc.id)
                  ? "bg-brand-500 border-brand-500 text-slate-900"
                  : "border-slate-600 bg-slate-800"
              }`}
            >
              {selectedAccountIds.has(acc.id) && <Check size={14} />}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-700">
              {acc.name.charAt(0)}
            </div>
          )}
          <h4 className="font-medium text-slate-200 group-hover:text-white text-sm line-clamp-1">
            {acc.name}
          </h4>
        </div>
        {acc.dueBalance > 0 ? (
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
        ) : acc.walletBalance > 0 ? (
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        ) : (
          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
        )}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 text-[10px] sm:text-xs pt-2 border-t border-slate-800">
        <div className="flex flex-col">
          <span className="text-slate-500 uppercase text-[9px]">Wallet</span>
          <span
            className={
              acc.walletBalance > 0
                ? "text-emerald-500 font-bold"
                : "text-slate-600"
            }
          >
            ₹{acc.walletBalance.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-slate-500 uppercase text-[9px]">Due</span>
          <span
            className={
              acc.dueBalance > 0 ? "text-red-500 font-bold" : "text-slate-600"
            }
          >
            ₹{acc.dueBalance.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  const renderCategoryCard = (category: Category) => {
    const categoryAccounts = accounts.filter(
      (a) => a.categoryId === category.id
    );
    const catStats = categoryAccounts.reduce(
      (acc, curr) => ({
        due: acc.due + curr.dueBalance,
        wallet: acc.wallet + curr.walletBalance,
      }),
      { due: 0, wallet: 0 }
    );
    const catNet = catStats.due - catStats.wallet;

    return (
      <div
        key={category.id}
        onClick={() => {
          setActiveViewCategoryId(category.id);
          setIsSelectionMode(false);
          setSelectedAccountIds(new Set());
        }}
        className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-sm hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/5 transition-all cursor-pointer group flex flex-col h-full"
      >
        {/* Category Header */}
        <div className="p-4 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  category.type === "LEDGER"
                    ? "bg-indigo-500/10 text-indigo-500"
                    : "bg-brand-500/10 text-brand-500"
                }`}
              >
                {category.type === "LEDGER" ? (
                  <FileText size={16} />
                ) : (
                  <Users size={16} />
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-brand-500 transition-colors">
                  {category.name}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {category.type === "LEDGER"
                    ? "Daily Log"
                    : `${categoryAccounts.length} Accounts`}
                </p>
              </div>
            </div>
            <div className="text-slate-600 group-hover:text-brand-500 transition-colors">
              <ChevronRight size={16} />
            </div>
          </div>

          {/* Category Mini Stats */}
          <div className="grid grid-cols-3 gap-2 text-center mt-2">
            <div className="bg-slate-950/50 rounded-md p-2 border border-slate-800/50">
              <p className="text-[9px] text-slate-500 uppercase leading-none mb-1.5">
                Due
              </p>
              <p className="text-xs font-bold text-red-400">
                ₹
                {catStats.due > 1000
                  ? (catStats.due / 1000).toFixed(1) + "k"
                  : catStats.due}
              </p>
            </div>
            <div className="bg-slate-950/50 rounded-md p-2 border border-slate-800/50">
              <p className="text-[9px] text-slate-500 uppercase leading-none mb-1.5">
                Wallet
              </p>
              <p className="text-xs font-bold text-emerald-400">
                ₹
                {catStats.wallet > 1000
                  ? (catStats.wallet / 1000).toFixed(1) + "k"
                  : catStats.wallet}
              </p>
            </div>
            <div className="bg-slate-950/50 rounded-md p-2 border border-slate-800/50">
              <p className="text-[9px] text-slate-500 uppercase leading-none mb-1.5">
                Net
              </p>
              <p
                className={`text-xs font-bold ${
                  catNet > 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {Math.abs(catNet) > 1000
                  ? (Math.abs(catNet) / 1000).toFixed(1) + "k"
                  : Math.abs(catNet)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="bg-slate-950/30 p-2 border-t border-slate-800 flex justify-center">
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide group-hover:text-brand-400 transition-colors">
            Open View
          </span>
        </div>
      </div>
    );
  };

  const renderDetailView = (isMobile: boolean) => {
    if (!activeViewCategoryId) return null;
    const category = categories.find((c) => c.id === activeViewCategoryId);
    if (!category) return null;

    const categoryAccounts = accounts.filter(
      (a) => a.categoryId === category.id
    );
    const catStats = categoryAccounts.reduce(
      (acc, curr) => ({
        due: acc.due + curr.dueBalance,
        wallet: acc.wallet + curr.walletBalance,
      }),
      { due: 0, wallet: 0 }
    );
    const catNet = catStats.due - catStats.wallet;

    // For LEDGER type, we focus on the single main account
    const ledgerAccount =
      category.type === "LEDGER" ? categoryAccounts[0] : null;

    // Mobile Container uses Fixed Overlay
    const Container = isMobile
      ? ({ children }: any) => (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
            {children}
          </div>
        )
      : ({ children }: any) => (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {children}
          </div>
        );

    // Header Content
    const Header = () => (
      <div
        className={`flex items-center gap-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 ${
          isMobile ? "p-4" : "pb-4 mb-4 bg-transparent border-0"
        }`}
      >
        <div className="flex-1 flex items-center gap-3">
          <button
            onClick={() => {
              setActiveViewCategoryId(null);
              setIsSelectionMode(false);
            }}
            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={isMobile ? 20 : 18} />
            {!isMobile && (
              <span className="text-sm font-medium">Back to Categories</span>
            )}
          </button>
          {isMobile && (
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {category.name}
              </h2>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isMobile && (
            <h2 className="text-xl font-bold text-white mr-4 flex items-center gap-2">
              {category.name}
              {category.type === "PEOPLE" && (
                <span className="text-xs font-medium bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {categoryAccounts.length}
                </span>
              )}
              {category.type === "LEDGER" && (
                <span className="text-xs font-medium bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Ledger
                </span>
              )}
            </h2>
          )}

          {/* DELETE CATEGORY BUTTON */}
          <button
            onClick={() => handleDeleteCategory(category.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-colors"
            title="Delete Category"
          >
            <Trash2 size={18} />
          </button>

          {/* SELECTION MODE BUTTON (Only for PEOPLE) */}
          {category.type === "PEOPLE" && categoryAccounts.length > 0 && (
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedAccountIds(new Set());
              }}
              className={`p-2 rounded-lg transition-colors ${
                isSelectionMode
                  ? "bg-brand-500 text-slate-900"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title="Select Accounts"
            >
              <CheckSquare size={18} />
            </button>
          )}

          {!isSelectionMode && (
            <button
              onClick={() => openAddAccountModal(category.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-slate-900 rounded-lg shadow-lg shadow-brand-500/20 active:scale-95 hover:bg-brand-400 transition-colors font-medium text-sm"
            >
              <Plus size={16} />{" "}
              <span className={isMobile ? "hidden md:inline" : "inline"}>
                {category.type === "LEDGER" ? "Add Entry" : "Add Account"}
              </span>
            </button>
          )}
        </div>
      </div>
    );

    return (
      <Container>
        <Header />
        <div
          className={`flex-1 overflow-y-auto custom-scrollbar ${
            isMobile ? "bg-slate-950" : ""
          }`}
        >
          <div className={isMobile ? "max-w-5xl mx-auto p-4 w-full" : ""}>
            {/* Selection Toolbar */}
            {isSelectionMode && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex justify-between items-center sticky top-0 z-10 shadow-lg">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedAccountIds.size === categoryAccounts.length)
                        setSelectedAccountIds(new Set());
                      else
                        setSelectedAccountIds(
                          new Set(categoryAccounts.map((a) => a.id))
                        );
                    }}
                    className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-2"
                  >
                    {selectedAccountIds.size === categoryAccounts.length ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                    Select All
                  </button>
                  <span className="text-xs text-slate-600">|</span>
                  <span className="text-xs text-slate-300">
                    {selectedAccountIds.size} Selected
                  </span>
                </div>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedAccountIds.size === 0}
                  className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Selected
                </button>
              </div>
            )}

            {/* Stats Summary Card (Hide in selection mode to save space) */}
            {!isSelectionMode && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-6 shadow-lg">
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-800">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase mb-1">
                      Total Due
                    </p>
                    <p className="text-sm md:text-xl font-bold text-red-500">
                      ₹{catStats.due.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase mb-1">
                      Wallet
                    </p>
                    <p className="text-sm md:text-xl font-bold text-emerald-500">
                      ₹{catStats.wallet.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase mb-1">
                      Net Status
                    </p>
                    <p
                      className={`text-sm md:text-xl font-bold ${
                        catNet > 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {catNet > 0 ? "Receivable" : "Advance"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW LOGIC: PEOPLE GRID vs LEDGER TABLE */}
            {category.type === "PEOPLE" ? (
              <>
                {categoryAccounts.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 border border-slate-800 border-dashed rounded-xl">
                    <p className="mb-2">No accounts found in this category.</p>
                    <button
                      onClick={() => openAddAccountModal(category.id)}
                      className="text-brand-500 font-medium text-sm hover:underline"
                    >
                      Add your first account
                    </button>
                  </div>
                ) : isMobile ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                    {categoryAccounts.map((acc) => (
                      <AccountListItem key={acc.id} acc={acc} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {categoryAccounts.map((acc) => (
                      <AccountCard key={acc.id} acc={acc} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              // LEDGER VIEW
              <>
                {!ledgerAccount || ledgerAccount.transactions.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 border border-slate-800 border-dashed rounded-xl">
                    <p className="mb-2">No entries in this log yet.</p>
                    <button
                      onClick={() => openAddAccountModal(category.id)}
                      className="text-brand-500 font-medium text-sm hover:underline"
                    >
                      Add first entry
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950/50 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {ledgerAccount.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-800/50">
                            <td className="px-4 py-2 text-xs text-slate-400 whitespace-nowrap">
                              {tx.date}
                            </td>
                            <td className="px-4 py-2 text-sm text-white font-medium">
                              {tx.description}
                            </td>
                            <td
                              className={`px-4 py-2 text-sm font-bold text-right whitespace-nowrap ${
                                tx.type === "DEBIT"
                                  ? "text-red-500"
                                  : "text-emerald-500"
                              }`}
                            >
                              {tx.type === "DEBIT" ? "-" : "+"} ₹
                              {tx.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                onClick={() =>
                                  deleteTransaction(ledgerAccount.id, tx.id)
                                }
                                className="text-slate-600 hover:text-red-500 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Bottom Spacer for Mobile */}
            {isMobile && <div className="h-24"></div>}
          </div>
        </div>
      </Container>
    );
  };

  const renderSearchResults = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Search Results
        </h3>
        <button
          onClick={() => setSearchQuery("")}
          className="text-xs text-brand-500 hover:underline"
        >
          Clear Search
        </button>
      </div>
      {filteredData && filteredData.length === 0 ? (
        <p className="text-slate-500 text-sm">No accounts found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredData?.map((acc) => {
            const cat = categories.find((c) => c.id === acc.categoryId);
            const loc = locations.find((l) => l.id === acc.locationId);
            return (
              <div
                key={acc.id}
                onClick={() => navigate(`/accounts/${acc.id}`)}
                className="bg-slate-900 p-3 rounded-lg border border-slate-800 hover:border-brand-500/50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-brand-500 font-bold border border-slate-700 text-xs">
                      {acc.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm group-hover:text-brand-500 transition-colors line-clamp-1">
                        {acc.name}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {loc?.name} &bull; {cat?.name}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center text-[10px] sm:text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-500">Wallet</span>
                    <span className="text-emerald-500 font-medium">
                      ₹{acc.walletBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-slate-500">Due</span>
                    <span className="text-red-500 font-medium">
                      ₹{acc.dueBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Mobile Overlay - Only renders when active category exists AND is mobile */}
      <div className="md:hidden">
        {activeViewCategoryId && renderDetailView(true)}
      </div>

      {/* Header & Search - Always visible on desktop, hidden on mobile if overlay active */}
      <div className="flex flex-col gap-3 mb-4 md:mb-5 md:flex-row md:items-center md:justify-between">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-white">Accounts Ledger</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Manage locations & staff.
          </p>
        </div>

        {/* Mobile Title */}
        <div className="md:hidden">
          <h1 className="text-lg font-bold text-white">Accounts</h1>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Search name, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 shadow-sm"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {searchQuery ? (
        renderSearchResults()
      ) : (
        <>
          {/* Desktop Detail View - Swaps content in place */}
          {activeViewCategoryId ? (
            <div className="hidden md:block">{renderDetailView(false)}</div>
          ) : (
            <>
              {/* Standard Dashboard View */}

              {/* Sticky Location Tabs */}
              <div className="sticky top-[60px] md:static z-10 bg-slate-950/95 backdrop-blur-md md:bg-transparent md:backdrop-blur-none -mx-4 px-4 md:mx-0 md:px-0 border-b border-white/5 md:border-none mb-4 pt-1 pb-2">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setActiveLocationId(loc.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border shrink-0 snap-start ${
                        activeLocationId === loc.id
                          ? "bg-brand-500 text-slate-900 border-brand-500 shadow-md shadow-brand-500/20"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <MapPin
                        size={14}
                        className={
                          activeLocationId === loc.id
                            ? "text-slate-900"
                            : "text-slate-500"
                        }
                      />
                      {loc.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsAddLocationOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-slate-800/50 text-brand-500 font-medium hover:bg-slate-800 transition-colors whitespace-nowrap border border-dashed border-slate-700 hover:border-brand-500 shrink-0"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Consolidated Location Summary Card */}
              {activeLocation && (
                <div className="bg-slate-900 rounded-xl border border-slate-800 mb-6 shadow-md overflow-hidden">
                  <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-slate-800 border-b border-slate-800 md:border-b-0">
                    {/* Total Dues */}
                    <div className="p-3 md:p-4 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="p-1 bg-red-500/10 rounded">
                          <AlertCircle size={14} className="text-red-500" />
                        </div>
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">
                          Total Dues
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-white">
                        ₹{locationStats.totalDue.toLocaleString()}
                      </h3>
                    </div>

                    {/* Total Wallet */}
                    <div className="p-3 md:p-4 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="p-1 bg-emerald-500/10 rounded">
                          <Wallet size={14} className="text-emerald-500" />
                        </div>
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">
                          Wallet
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-white">
                        ₹{locationStats.totalWallet.toLocaleString()}
                      </h3>
                    </div>

                    {/* Net Position (Desktop) */}
                    <div className="hidden md:flex p-4 flex-col justify-center bg-slate-950/30">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                        Net Position
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h3
                          className={`text-xl font-bold ${
                            netAmount > 0 ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          ₹{Math.abs(netAmount).toLocaleString()}
                        </h3>
                        <span className="text-[10px] text-slate-500 font-medium uppercase border border-slate-700 px-1.5 py-0.5 rounded">
                          {netAmount > 0 ? "Receivable" : "In Advance"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Position (Mobile Footer) */}
                  <div className="md:hidden p-3 bg-slate-950/50 flex items-center justify-between border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded ${
                          netAmount > 0 ? "bg-red-500/10" : "bg-emerald-500/10"
                        }`}
                      >
                        {netAmount > 0 ? (
                          <ArrowDownRight size={16} className="text-red-500" />
                        ) : (
                          <ArrowUpRight
                            size={16}
                            className="text-emerald-500"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-none">
                          Net Position
                        </p>
                        <p
                          className={`text-sm font-bold leading-tight ${
                            netAmount > 0 ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {netAmount > 0 ? "Receivable" : "In Advance"}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        netAmount > 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      ₹{Math.abs(netAmount).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Categories Grid */}
              <div className="mb-3 flex justify-between items-center">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-1 h-5 bg-brand-500 rounded-full"></span>
                  Categories
                </h2>
                <button
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors active:scale-95"
                >
                  <Plus size={14} />{" "}
                  <span className="hidden md:inline">New Category</span>
                  <span className="md:hidden">New</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoriesInActiveLocation.map(renderCategoryCard)}

                {/* Empty State for Location */}
                {categoriesInActiveLocation.length === 0 && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                    <FolderOpen size={32} className="mb-3 opacity-20" />
                    <p className="text-sm">
                      No categories in this location yet.
                    </p>
                    <button
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="mt-3 text-sm text-brand-500 hover:text-brand-400 font-medium hover:underline"
                    >
                      Create one now
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* --- Modals --- */}

      {/* Add Location Modal */}
      {isAddLocationOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-end md:items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in duration-200 mb-safe md:mb-0">
            <h3 className="text-base font-bold text-white mb-3">
              Add New Location
            </h3>
            <input
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 mb-4 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder-slate-500"
              placeholder="e.g. Warehouse 3"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddLocationOpen(false)}
                className="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLocation}
                className="px-4 py-2 text-sm bg-brand-500 text-slate-900 font-medium rounded-lg hover:bg-brand-400 shadow-lg shadow-brand-500/20"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-end md:items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in duration-200 mb-safe md:mb-0">
            <h3 className="text-base font-bold text-white mb-4">
              Add Category
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Adding to:{" "}
              <span className="font-semibold text-brand-500">
                {activeLocation?.name}
              </span>
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Category Name
                </label>
                <input
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder-slate-500"
                  placeholder="e.g. Drivers"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Category Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setNewCategoryType("PEOPLE")}
                    className={`p-2 border rounded-lg cursor-pointer transition-all ${
                      newCategoryType === "PEOPLE"
                        ? "bg-brand-500/10 border-brand-500"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          newCategoryType === "PEOPLE"
                            ? "border-brand-500"
                            : "border-slate-500"
                        }`}
                      >
                        {newCategoryType === "PEOPLE" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          newCategoryType === "PEOPLE"
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      >
                        People
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-5">
                      Individual Accounts
                    </p>
                  </div>
                  <div
                    onClick={() => setNewCategoryType("LEDGER")}
                    className={`p-2 border rounded-lg cursor-pointer transition-all ${
                      newCategoryType === "LEDGER"
                        ? "bg-indigo-500/10 border-indigo-500"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          newCategoryType === "LEDGER"
                            ? "border-indigo-500"
                            : "border-slate-500"
                        }`}
                      >
                        {newCategoryType === "LEDGER" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          newCategoryType === "LEDGER"
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      >
                        Log Book
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-5">
                      Daily Entries/Expenses
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 text-sm bg-brand-500 text-slate-900 font-medium rounded-lg hover:bg-brand-400 shadow-lg shadow-brand-500/20"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account/Entry Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-end md:items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-xl max-w-4xl w-full p-5 shadow-2xl animate-in fade-in zoom-in duration-200 mb-safe md:mb-0 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                {categories.find((c) => c.id === selectedCategoryForAccount)
                  ?.type === "LEDGER"
                  ? "Add Log Entry"
                  : "Add Account"}
              </h3>
              <button
                onClick={closeAddAccountModal}
                className="text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-5 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
              <button
                onClick={() => {
                  setNewAccountMode("SINGLE");
                  setBulkImportStep("INPUT");
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                  newAccountMode === "SINGLE"
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Single Entry
              </button>
              <button
                onClick={() => setNewAccountMode("BULK")}
                className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                  newAccountMode === "BULK"
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Bulk Import
              </button>
            </div>

            {newAccountMode === "SINGLE" ? (
              categories.find((c) => c.id === selectedCategoryForAccount)
                ?.type === "LEDGER" ? (
                // LEDGER SINGLE ENTRY FORM
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                      value={ledgerEntryData.date}
                      onChange={(e) =>
                        setLedgerEntryData({
                          ...ledgerEntryData,
                          date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Description / Name
                    </label>
                    <input
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder-slate-500"
                      placeholder="e.g. Daily Wages - 5 men"
                      value={ledgerEntryData.description}
                      onChange={(e) =>
                        setLedgerEntryData({
                          ...ledgerEntryData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                      value={ledgerEntryData.amount}
                      onChange={(e) =>
                        setLedgerEntryData({
                          ...ledgerEntryData,
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setLedgerEntryData({
                            ...ledgerEntryData,
                            type: "DEBIT",
                          })
                        }
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border ${
                          ledgerEntryData.type === "DEBIT"
                            ? "bg-red-500/20 border-red-500 text-red-500"
                            : "bg-slate-950 border-slate-700 text-slate-500"
                        }`}
                      >
                        Debit (Due +)
                      </button>
                      <button
                        onClick={() =>
                          setLedgerEntryData({
                            ...ledgerEntryData,
                            type: "CREDIT",
                          })
                        }
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border ${
                          ledgerEntryData.type === "CREDIT"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-500"
                            : "bg-slate-950 border-slate-700 text-slate-500"
                        }`}
                      >
                        Credit (Pay)
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={closeAddAccountModal}
                      className="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddLedgerEntry}
                      className="px-4 py-2 text-sm bg-brand-500 text-slate-900 font-medium rounded-lg hover:bg-brand-400 shadow-lg shadow-brand-500/20"
                    >
                      Add Entry
                    </button>
                  </div>
                </div>
              ) : (
                // PEOPLE ACCOUNT FORM
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Full Name
                    </label>
                    <input
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder-slate-500"
                      placeholder="e.g. John Doe"
                      value={singleAccountData.name}
                      onChange={(e) =>
                        setSingleAccountData({
                          ...singleAccountData,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Wallet (Adv)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        value={singleAccountData.walletBalance}
                        onChange={(e) =>
                          setSingleAccountData({
                            ...singleAccountData,
                            walletBalance: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Due Balance
                      </label>
                      <input
                        type="number"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        value={singleAccountData.dueBalance}
                        onChange={(e) =>
                          setSingleAccountData({
                            ...singleAccountData,
                            dueBalance: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                      value={singleAccountData.joiningDate}
                      onChange={(e) =>
                        setSingleAccountData({
                          ...singleAccountData,
                          joiningDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={closeAddAccountModal}
                      className="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAccount}
                      className="px-4 py-2 text-sm bg-brand-500 text-slate-900 font-medium rounded-lg hover:bg-brand-400 shadow-lg shadow-brand-500/20"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )
            ) : (
              // BULK IMPORT FLOW
              <div className="flex flex-col h-full overflow-hidden">
                {bulkImportStep === "INPUT" ? (
                  <div className="space-y-4">
                    {/* Mode Selection for Bulk */}
                    {categories.find((c) => c.id === selectedCategoryForAccount)
                      ?.type !== "LEDGER" && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div
                          onClick={() => setBulkImportMode("ACCOUNTS")}
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${
                            bulkImportMode === "ACCOUNTS"
                              ? "bg-brand-500/10 border-brand-500"
                              : "bg-slate-950 border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                bulkImportMode === "ACCOUNTS"
                                  ? "border-brand-500"
                                  : "border-slate-500"
                              }`}
                            >
                              {bulkImportMode === "ACCOUNTS" && (
                                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                              )}
                            </div>
                            <span
                              className={`font-bold text-sm ${
                                bulkImportMode === "ACCOUNTS"
                                  ? "text-white"
                                  : "text-slate-400"
                              }`}
                            >
                              Create Accounts
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 pl-6">
                            Import new people into the system.
                          </p>
                        </div>

                        <div
                          onClick={() => setBulkImportMode("TRANSACTIONS")}
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${
                            bulkImportMode === "TRANSACTIONS"
                              ? "bg-brand-500/10 border-brand-500"
                              : "bg-slate-950 border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                bulkImportMode === "TRANSACTIONS"
                                  ? "border-brand-500"
                                  : "border-slate-500"
                              }`}
                            >
                              {bulkImportMode === "TRANSACTIONS" && (
                                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                              )}
                            </div>
                            <span
                              className={`font-bold text-sm ${
                                bulkImportMode === "TRANSACTIONS"
                                  ? "text-white"
                                  : "text-slate-400"
                              }`}
                            >
                              Record Transactions
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 pl-6">
                            Add money to existing people.
                          </p>
                        </div>
                      </div>
                    )}
                    {categories.find((c) => c.id === selectedCategoryForAccount)
                      ?.type === "LEDGER" && (
                      <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl mb-4">
                        <p className="text-sm text-indigo-400 font-medium">
                          Log Book Mode Active
                        </p>
                        <p className="text-xs text-indigo-300/70 mt-1">
                          Data will be imported directly as entries into this
                          ledger.
                        </p>
                      </div>
                    )}

                    {/* File Upload Area */}
                    <div
                      className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:bg-slate-800/50 hover:border-brand-500/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        accept=".csv,.txt"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-500">
                        <Upload size={24} />
                      </div>
                      <p className="text-sm font-medium text-white">
                        Click to upload CSV
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Expected Format: Name/Desc, Amount, Date
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-slate-900 text-slate-500">
                          Or paste text
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none font-mono placeholder-slate-600"
                        placeholder={
                          categories.find(
                            (c) => c.id === selectedCategoryForAccount
                          )?.type === "LEDGER"
                            ? "Tea expenses, 150, 2023-10-01\nDiesel, 5000"
                            : "Ravi Kumar, 500, 2023-10-01\nSunil Singh, 1000"
                        }
                        value={bulkTextData}
                        onChange={(e) => setBulkTextData(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => parseBulkData(bulkTextData)}
                        disabled={!bulkTextData.trim()}
                        className="px-4 py-2 text-sm bg-brand-500 text-slate-900 font-medium rounded-lg hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Preview Data
                      </button>
                    </div>
                  </div>
                ) : (
                  // PREVIEW STEP - EDITABLE GRID
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBulkImportStep("INPUT")}
                          className="text-xs text-slate-500 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
                        >
                          <ArrowLeft size={12} /> Back
                        </button>
                        <span className="text-sm font-bold text-white">
                          Review Data
                        </span>
                      </div>

                      {bulkImportMode === "TRANSACTIONS" && (
                        <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-700">
                          <button
                            onClick={() => setBulkTransactionType("DEBIT")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                              bulkTransactionType === "DEBIT"
                                ? "bg-red-500 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Debit (Due)
                          </button>
                          <button
                            onClick={() => setBulkTransactionType("CREDIT")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                              bulkTransactionType === "CREDIT"
                                ? "bg-emerald-500 text-slate-900"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Credit (Pay)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-lg flex-1 flex flex-col overflow-hidden">
                      {/* Sticky Header with Mappings */}
                      <div className="bg-slate-900 border-b border-slate-800 shrink-0">
                        <div className="flex divide-x divide-slate-800">
                          {rawGridData[0]?.map((_, colIndex) => (
                            <div
                              key={colIndex}
                              className="p-2 min-w-[120px] flex-1"
                            >
                              <select
                                value={columnMapping[colIndex] || "IGNORE"}
                                onChange={(e) =>
                                  updateColumnMapping(
                                    colIndex,
                                    e.target.value as ColumnType
                                  )
                                }
                                className="w-full bg-slate-950 border border-slate-700 text-[10px] text-white rounded p-1 outline-none focus:border-brand-500 uppercase font-bold"
                              >
                                <option value="IGNORE">Ignore</option>
                                <option value="NAME">Name/Desc</option>
                                <option value="AMOUNT">Amount</option>
                                <option value="DATE">Date</option>
                                <option value="NOTE">Note</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scrollable Body */}
                      <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-slate-800">
                            {rawGridData.map((row, rowIndex) => {
                              const nameColIndex = columnMapping.findIndex(
                                (c) => c === "NAME"
                              );
                              const name = row[nameColIndex] || "";
                              const category = categories.find(
                                (c) => c.id === selectedCategoryForAccount
                              );

                              // Validation Logic
                              let isError = false;
                              if (category?.type === "PEOPLE") {
                                const exists = getAccountStatus(name);
                                isError =
                                  bulkImportMode === "ACCOUNTS"
                                    ? exists
                                    : !exists && name.trim() !== "";
                              }

                              return (
                                <tr
                                  key={rowIndex}
                                  className="hover:bg-slate-900/50"
                                >
                                  {row.map((cell, colIndex) => (
                                    <td
                                      key={colIndex}
                                      className="p-0 border-r border-slate-800 last:border-0 min-w-[120px]"
                                    >
                                      <input
                                        value={cell}
                                        onChange={(e) =>
                                          updateCell(
                                            rowIndex,
                                            colIndex,
                                            e.target.value
                                          )
                                        }
                                        className={`w-full bg-transparent p-2 text-xs text-white outline-none focus:bg-slate-800 focus:text-brand-500 transition-colors
                                                                    ${
                                                                      columnMapping[
                                                                        colIndex
                                                                      ] ===
                                                                        "NAME" &&
                                                                      isError
                                                                        ? "text-red-400 font-bold"
                                                                        : ""
                                                                    }
                                                                `}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Totals */}
                      <div className="bg-slate-900 border-t border-slate-800 p-3 flex justify-between items-center shrink-0">
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <List size={14} /> {rawGridData.length} Rows
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase">
                              Total Amount
                            </p>
                            <p className="text-sm font-bold text-white">
                              ₹{totalImportAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Validation Messages */}
                    {categories.find((c) => c.id === selectedCategoryForAccount)
                      ?.type === "PEOPLE" &&
                      bulkImportMode === "ACCOUNTS" &&
                      rawGridData.some((row) =>
                        getAccountStatus(
                          row[columnMapping.findIndex((c) => c === "NAME")]
                        )
                      ) && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-2 bg-red-500/5 p-2 rounded border border-red-500/10">
                          <AlertTriangle size={14} />
                          Warning: Highlighted names already exist. Duplicates
                          will be created.
                        </p>
                      )}
                    {categories.find((c) => c.id === selectedCategoryForAccount)
                      ?.type === "PEOPLE" &&
                      bulkImportMode === "TRANSACTIONS" &&
                      rawGridData.some(
                        (row) =>
                          !getAccountStatus(
                            row[columnMapping.findIndex((c) => c === "NAME")]
                          ) &&
                          row[
                            columnMapping.findIndex((c) => c === "NAME")
                          ]?.trim() !== ""
                      ) && (
                        <p className="text-xs text-orange-400 mt-2 flex items-center gap-2 bg-orange-500/5 p-2 rounded border border-orange-500/10">
                          <AlertTriangle size={14} />
                          Warning: Highlighted names do not exist. Transactions
                          will be skipped for them.
                        </p>
                      )}

                    <div className="flex justify-end pt-4 shrink-0">
                      <button
                        onClick={handleCreateAccount}
                        disabled={rawGridData.length === 0}
                        className="px-6 py-2.5 text-sm bg-brand-500 text-slate-900 font-bold rounded-lg hover:bg-brand-400 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                      >
                        {bulkImportMode === "ACCOUNTS"
                          ? "Create Accounts"
                          : "Record Transactions"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
