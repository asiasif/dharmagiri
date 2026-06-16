import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Database, Trash2, QrCode, ArrowLeft, Loader, Users, Layout, Compass, ShieldCheck, Download, Search, Edit, Plus, X, Bell, BellOff, Pin, Megaphone, FileDown } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import confetti from "canvas-confetti";
import { collection, writeBatch, doc, getDocs, deleteDoc, limit, query, setDoc, addDoc, serverTimestamp, orderBy, onSnapshot } from "firebase/firestore";
import { db, isValidConfig } from "../firebase";

const DATABASE_FIELDS = [
  { key: "registerNumber", label: "Register / Enrollment Number", required: true },
  { key: "name", label: "Student Name", required: true },
  { key: "course", label: "Course Code & Name", required: true },
  { key: "examDate", label: "Exam Date", required: true },
  { key: "examTime", label: "Exam Time", required: true },
  { key: "block", label: "Block / Building", required: true },
  { key: "floor", label: "Floor", required: true },
  { key: "roomNumber", label: "Room Number", required: true },
  { key: "seatNumber", label: "Seat Number (Optional)", required: false },
];

export default function AdminDashboard({ onBack }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  
  // Analytics
  const [stats, setStats] = useState({ totalStudents: 0, totalRooms: 0, totalBlocks: 0 });
  const [studentsList, setStudentsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Export state
  const [exporting, setExporting] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementType, setAnnouncementType] = useState("info"); // info | warning | success
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  const qrRef = useRef();
  const qrCanvasRef = useRef();

  // Manual Student Form Modal states
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Form Field states
  const [formRegisterNumber, setFormRegisterNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formCourse, setFormCourse] = useState("");
  const [formExamDate, setFormExamDate] = useState("");
  const [formExamTime, setFormExamTime] = useState("");
  const [formBlock, setFormBlock] = useState("");
  const [formFloor, setFormFloor] = useState("");
  const [formRoomNumber, setFormRoomNumber] = useState("");
  const [formSeatNumber, setFormSeatNumber] = useState("");

  useEffect(() => {
    fetchStatsAndData();
    fetchAnnouncements();
  }, []);

  const fetchStatsAndData = async () => {
    if (!isValidConfig || !db) return;
    setListLoading(true);
    try {
      const studentsRef = collection(db, "students");
      const snapshot = await getDocs(query(studentsRef, limit(100))); // load first 100
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudentsList(items);

      // Compute simple stats from all documents in db
      const allDocs = await getDocs(studentsRef);
      const rooms = new Set();
      const blocks = new Set();
      allDocs.docs.forEach(d => {
        const data = d.data();
        if (data.roomNumber) rooms.add(data.roomNumber.toLowerCase().trim());
        if (data.block) blocks.add(data.block.toLowerCase().trim());
      });

      setStats({
        totalStudents: allDocs.size,
        totalRooms: rooms.size,
        totalBlocks: blocks.size
      });
    } catch (e) {
      console.error("Error loading admin stats:", e);
    } finally {
      setListLoading(false);
    }
  };

  // ─── Export to CSV / Excel ────────────────────────────────────────────────
  const handleExportCSV = async () => {
    if (!isValidConfig || !db) {
      alert("Firebase is not configured. Cannot export.");
      return;
    }
    setExporting(true);
    try {
      const snapshot = await getDocs(collection(db, "students"));
      const rows = snapshot.docs.map(d => d.data());
      if (rows.length === 0) { alert("No records to export."); return; }
      const csv = Papa.unparse(rows.map(r => ({
        "Register Number": r.registerNumber,
        "Name": r.name,
        "Course": r.course,
        "Exam Date": r.examDate,
        "Exam Time": r.examTime,
        "Block": r.block,
        "Floor": r.floor,
        "Room Number": r.roomNumber,
        "Seat Number": r.seatNumber || "",
      })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dharmagiri-students-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportXLSX = async () => {
    if (!isValidConfig || !db) {
      alert("Firebase is not configured. Cannot export.");
      return;
    }
    setExporting(true);
    try {
      const snapshot = await getDocs(collection(db, "students"));
      const rows = snapshot.docs.map(d => d.data());
      if (rows.length === 0) { alert("No records to export."); return; }
      const sheetData = rows.map(r => ({
        "Register Number": r.registerNumber,
        "Name": r.name,
        "Course": r.course,
        "Exam Date": r.examDate,
        "Exam Time": r.examTime,
        "Block": r.block,
        "Floor": r.floor,
        "Room Number": r.roomNumber,
        "Seat Number": r.seatNumber || "",
      }));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, `dharmagiri-students-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  // ─── Announcements ────────────────────────────────────────────────────────
  const fetchAnnouncements = async () => {
    if (!isValidConfig || !db) return;
    setAnnouncementsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Announcements fetch error:", e);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!isValidConfig || !db) { alert("Firebase not configured."); return; }
    if (!announcementTitle.trim() || !announcementBody.trim()) { alert("Please fill in title and message."); return; }
    setSavingAnnouncement(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        type: announcementType,
        pinned: announcementPinned,
        createdAt: serverTimestamp(),
      });
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementType("info");
      setAnnouncementPinned(false);
      setShowAnnouncementModal(false);
      fetchAnnouncements();
    } catch (e) {
      alert("Failed to post announcement: " + e.message);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    if (!isValidConfig || !db) return;
    try {
      await deleteDoc(doc(db, "announcements", id));
      fetchAnnouncements();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    const fileExtension = selectedFile.name.split(".").pop().toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setHeaders(Object.keys(results.data[0]));
            setParsedData(results.data);
            autoMapHeaders(Object.keys(results.data[0]));
          }
        },
      });
    } else if (["xlsx", "xls"].includes(fileExtension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (jsonData.length > 0) {
          setHeaders(Object.keys(jsonData[0]));
          setParsedData(jsonData);
          autoMapHeaders(Object.keys(jsonData[0]));
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      alert("Unsupported file format. Please upload a CSV or Excel file.");
    }
  };

  const autoMapHeaders = (fileHeaders) => {
    const newMapping = {};
    fileHeaders.forEach((header) => {
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      if (cleanHeader.includes("register") || cleanHeader.includes("enrollment") || cleanHeader.includes("reg") || cleanHeader.includes("id")) {
        newMapping.registerNumber = header;
      } else if (cleanHeader.includes("name") || cleanHeader.includes("student")) {
        newMapping.name = header;
      } else if (cleanHeader.includes("course") || cleanHeader.includes("subject") || cleanHeader.includes("sub") || cleanHeader.includes("paper")) {
        newMapping.course = header;
      } else if (cleanHeader.includes("date") || cleanHeader.includes("examdate")) {
        newMapping.examDate = header;
      } else if (cleanHeader.includes("time") || cleanHeader.includes("session")) {
        newMapping.examTime = header;
      } else if (cleanHeader.includes("block") || cleanHeader.includes("building")) {
        newMapping.block = header;
      } else if (cleanHeader.includes("floor")) {
        newMapping.floor = header;
      } else if (cleanHeader.includes("room") || cleanHeader.includes("classroom") || cleanHeader.includes("class")) {
        newMapping.roomNumber = header;
      } else if (cleanHeader.includes("seat") || cleanHeader.includes("bench")) {
        newMapping.seatNumber = header;
      }
    });
    setMapping(newMapping);
  };

  const handleMapChange = (dbFieldKey, fileHeader) => {
    setMapping((prev) => ({ ...prev, [dbFieldKey]: fileHeader }));
  };

  const handleUploadToFirebase = async () => {
    if (!isValidConfig || !db) {
      alert("Firebase is not configured yet! Click database configuration to connect.");
      return;
    }

    // Validate mappings
    const missingFields = DATABASE_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (missingFields.length > 0) {
      alert(`Please map all required fields: ${missingFields.map(f => f.label).join(", ")}`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Formatting data...");

    try {
      // 1. Prepare data objects
      const formattedStudents = parsedData.map((row) => {
        const student = {};
        DATABASE_FIELDS.forEach((field) => {
          const mappedHeader = mapping[field.key];
          student[field.key] = mappedHeader ? String(row[mappedHeader] || "").trim() : "";
        });
        // Add lowercased register number for easy searching
        student.registerNumberLower = student.registerNumber.toLowerCase();
        return student;
      });

      // 2. Batch upload to Firestore (limit 500 per batch)
      const batchSize = 200;
      const totalDocs = formattedStudents.length;
      let uploadedCount = 0;

      for (let i = 0; i < totalDocs; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = formattedStudents.slice(i, i + batchSize);

        chunk.forEach((student) => {
          const docRef = doc(collection(db, "students"), student.registerNumberLower);
          batch.set(docRef, student);
        });

        setUploadStatus(`Uploading records ${i + 1} to ${Math.min(i + batchSize, totalDocs)} of ${totalDocs}...`);
        await batch.commit();
        
        uploadedCount += chunk.length;
        setUploadProgress(Math.round((uploadedCount / totalDocs) * 100));
      }

      setUploadStatus("Successfully updated Firestore!");
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Reset states
      setFile(null);
      setParsedData([]);
      fetchStatsAndData();
    } catch (error) {
      console.error("Firebase Batch Upload Error:", error);
      setUploadStatus(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete ALL student seating arrangements from the database.")) {
      return;
    }

    if (!isValidConfig || !db) return;

    setUploading(true);
    setUploadStatus("Clearing seating database...");
    try {
      const studentsRef = collection(db, "students");
      const snapshot = await getDocs(studentsRef);
      
      const batchSize = 200;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + batchSize);
        chunk.forEach((d) => {
          batch.delete(doc(db, "students", d.id));
        });
        await batch.commit();
      }

      setUploadStatus("Database cleared successfully!");
      fetchStatsAndData();
    } catch (e) {
      console.error(e);
      alert("Failed to clear database.");
    } finally {
      setUploading(false);
    }
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormRegisterNumber("");
    setFormName("");
    setFormCourse("");
    setFormExamDate("");
    setFormExamTime("");
    setFormBlock("");
    setFormFloor("");
    setFormRoomNumber("");
    setFormSeatNumber("");
    setShowStudentModal(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormRegisterNumber(student.registerNumber || "");
    setFormName(student.name || "");
    setFormCourse(student.course || "");
    setFormExamDate(student.examDate || "");
    setFormExamTime(student.examTime || "");
    setFormBlock(student.block || "");
    setFormFloor(student.floor || "");
    setFormRoomNumber(student.roomNumber || "");
    setFormSeatNumber(student.seatNumber || "");
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!isValidConfig || !db) {
      alert("Firebase configuration is invalid. Please configure the connection first.");
      return;
    }

    const regNum = formRegisterNumber.trim();
    const regNumLower = regNum.toLowerCase();

    if (!regNum || !formName.trim() || !formCourse.trim() || !formExamDate.trim() || !formExamTime.trim() || !formBlock.trim() || !formFloor.trim() || !formRoomNumber.trim()) {
      alert("Please fill out all required fields.");
      return;
    }

    setUploading(true);
    setUploadStatus("Saving student seating record...");
    try {
      const studentData = {
        registerNumber: regNum,
        registerNumberLower: regNumLower,
        name: formName.trim(),
        course: formCourse.trim(),
        examDate: formExamDate.trim(),
        examTime: formExamTime.trim(),
        block: formBlock.trim(),
        floor: formFloor.trim(),
        roomNumber: formRoomNumber.trim(),
        seatNumber: formSeatNumber.trim()
      };

      // If editing and registration number has changed, remove old document
      if (editingStudent && editingStudent.registerNumberLower !== regNumLower) {
        const oldDocRef = doc(db, "students", editingStudent.registerNumberLower);
        await deleteDoc(oldDocRef);
      }

      const newDocRef = doc(db, "students", regNumLower);
      await setDoc(newDocRef, studentData);

      setUploadStatus(editingStudent ? "Student seating updated!" : "Student seating added manually!");
      setShowStudentModal(false);
      fetchStatsAndData();
      
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 }
      });
    } catch (error) {
      console.error("Error saving student record:", error);
      alert(`Save failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Are you sure you want to permanently delete the seating details for ${student.name} (${student.registerNumber})?`)) {
      return;
    }

    if (!isValidConfig || !db) return;

    setListLoading(true);
    try {
      const docRef = doc(db, "students", student.registerNumberLower);
      await deleteDoc(docRef);
      fetchStatsAndData();
    } catch (e) {
      console.error("Error deleting student record:", e);
      alert(`Failed to delete student record: ${e.message}`);
    } finally {
      setListLoading(false);
    }
  };

  const handleDownloadPNG = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const targetCanvas = canvas.tagName === "CANVAS" ? canvas : canvas.querySelector("canvas");
    if (!targetCanvas) return;

    try {
      const pngUrl = targetCanvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = "dharmagiri-exam-locator-qr.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("PNG download failed, trying SVG fallback:", err);
      handleDownloadSVG();
    }
  };

  const handleDownloadSVG = () => {
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    try {
      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = "dharmagiri-exam-locator-qr.svg";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    } catch (err) {
      console.error("SVG download failed:", err);
    }
  };

  const handleDownloadSampleCSV = () => {
    const link = document.createElement('a');
    link.href = `${window.location.origin}/sample_students.csv`;
    link.download = 'sample_students.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = studentsList.filter(s => 
    s.registerNumber.toLowerCase().includes(searchFilter.toLowerCase()) || 
    s.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={onBack} className="btn btn-secondary" style={backBtnStyle}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={22} style={{ color: "var(--accent)" }} />
              Admin Seating Control Panel
            </h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Import seating arrays and configure locators
            </p>
          </div>
        </div>
      </header>

      {/* Analytics widgets */}
      <section className="admin-stats-grid">
        <div className="glass-panel" style={statCardStyle}>
          <Users className="gradient-text" size={24} />
          <div>
            <span style={statLabelStyle}>Registered Students</span>
            <span style={statValueStyle}>{stats.totalStudents}</span>
          </div>
        </div>

        <div className="glass-panel" style={statCardStyle}>
          <Layout className="gradient-text-teal" size={24} />
          <div>
            <span style={statLabelStyle}>Active Rooms</span>
            <span style={statValueStyle}>{stats.totalRooms}</span>
          </div>
        </div>

        <div className="glass-panel" style={statCardStyle}>
          <Compass size={24} style={{ color: "var(--secondary)" }} />
          <div>
            <span style={statLabelStyle}>Active Blocks</span>
            <span style={statValueStyle}>{stats.totalBlocks}</span>
          </div>
        </div>

        {/* Export quick actions */}
        <div className="glass-panel" style={{ ...statCardStyle, flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileDown size={22} style={{ color: "var(--accent)" }} />
            <span style={statLabelStyle}>Export Database</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="btn btn-secondary"
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem" }}
            >
              {exporting ? <Loader size={13} className="spin" /> : <Download size={13} />}
              CSV
            </button>
            <button
              onClick={handleExportXLSX}
              disabled={exporting}
              className="btn btn-accent"
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem" }}
            >
              {exporting ? <Loader size={13} className="spin" /> : <Download size={13} />}
              Excel
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Upload & QR Code */}
      <div className="admin-main-grid">
        {/* CSV/Excel Loader */}
        <section className="glass-panel admin-main-grid-full" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSpreadsheet size={20} style={{ color: "var(--primary)" }} />
            Import Student Seating List
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Upload a spreadsheet containing student registration numbers, seating maps, dates, times, floors, and rooms. Compatible with CSV, XLSX, and XLS formats.
          </p>
          <button onClick={handleDownloadSampleCSV} className="btn btn-muted" style={{ marginBottom: "1.5rem", fontSize: "0.85rem" }}>
            Download Sample CSV
          </button>

          {!file ? (
            <div
              className={`upload-dropzone ${dragActive ? "drag-active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("fileInput").click()}
            >
              <Upload size={40} style={{ color: "var(--primary)", opacity: 0.8 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>Drag & drop your CSV or Excel file here</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>or click to browse your local files</p>
              </div>
              <input
                id="fileInput"
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          ) : (
            <div style={fileDetailsContainerStyle}>
              <div style={fileRowStyle}>
                <FileSpreadsheet size={24} style={{ color: "var(--success)" }} />
                <div style={{ flexGrow: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{file.name}</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {(file.size / 1024).toFixed(1)} KB • {parsedData.length} records parsed
                  </p>
                </div>
                <button onClick={() => { setFile(null); setParsedData([]); }} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                  Clear
                </button>
              </div>

              {/* Column Mapping Section */}
              <div style={mappingBoxStyle}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "0.5rem" }}>
                  Map Spreadsheet Columns
                </h3>
                
                <div className="mapping-grid">
                  {DATABASE_FIELDS.map((dbField) => {
                    const isMapped = !!mapping[dbField.key];
                    return (
                      <div key={dbField.key} style={mappingItemStyle}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                          {dbField.label} {dbField.required && <span style={{ color: "var(--danger)" }}>*</span>}
                        </label>
                        <select
                          value={mapping[dbField.key] || ""}
                          onChange={(e) => handleMapChange(dbField.key, e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">-- Choose Column --</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload actions */}
              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                <button
                  onClick={handleUploadToFirebase}
                  className="btn btn-primary"
                  disabled={uploading}
                  style={{ minWidth: "160px" }}
                >
                  {uploading ? (
                    <>
                      <Loader size={16} className="spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      Commit to Firestore
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Progress / Status feedback */}
          {uploading && (
            <div style={progressBoxStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>{uploadStatus}</span>
                <span style={{ fontWeight: 600, color: "var(--primary)" }}>{uploadProgress}%</span>
              </div>
              <div style={progressBarBgStyle}>
                <div style={{ ...progressBarFillStyle, width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          {uploadStatus && !uploading && (
            <div style={{ ...statusFeedbackStyle, borderColor: uploadStatus.includes("failed") ? "var(--danger)" : "var(--success)" }}>
              {uploadStatus.includes("failed") ? (
                <AlertCircle size={16} style={{ color: "var(--danger)" }} />
              ) : (
                <CheckCircle size={16} style={{ color: "var(--success)" }} />
              )}
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{uploadStatus}</span>
            </div>
          )}
        </section>

        {/* QR Code generator */}
        <section className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <QrCode size={20} style={{ color: "var(--accent)" }} />
              Dharmagiri QR Gateway
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              Print this QR code and paste it at the college main gate. Students can scan it to instantly load the seating locator.
            </p>
          </div>

          <div style={qrWrapperStyle}>
            <div ref={qrRef} style={qrContainerStyle}>
              <QRCodeSVG
                value={window.location.origin}
                size={180}
                bgColor={"#ffffff"}
                fgColor={"#080a10"}
                level={"H"}
                includeMargin={true}
              />
            </div>

            {/* Hidden canvas for high-resolution PNG download */}
            <div style={{ display: "none" }}>
              <QRCodeCanvas
                ref={qrCanvasRef}
                value={window.location.origin}
                size={512}
                bgColor={"#ffffff"}
                fgColor={"#080a10"}
                level={"H"}
                includeMargin={true}
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
              <button onClick={handleDownloadPNG} className="btn btn-accent" style={{ width: "100%", fontSize: "0.85rem" }}>
                <Download size={16} />
                Download PNG (High-Res)
              </button>
              <button onClick={handleDownloadSVG} className="btn btn-secondary" style={{ width: "100%", fontSize: "0.85rem" }}>
                <Download size={16} style={{ color: "var(--accent)" }} />
                Download SVG (Vector)
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Database Viewer & Actions */}
      <section className="glass-panel" style={{ padding: "2rem", marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Database Student Logs</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Showing first 100 loaded records in the database.
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={dbSearchContainerStyle}>
              <Search size={16} style={dbSearchIconStyle} />
              <input
                type="text"
                placeholder="Search local logs..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={dbSearchInputStyle}
              />
            </div>
            
            <button onClick={openAddModal} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
              <Plus size={16} />
              Add Student
            </button>
            
            <button onClick={handleDeleteAll} className="btn btn-danger" style={{ fontSize: "0.85rem" }}>
              <Trash2 size={16} />
              Delete All Records
            </button>
          </div>
        </div>

        {listLoading ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <Loader size={30} className="spin" style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading database records...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Reg Number</th>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Date & Time</th>
                  <th>Location (Block / Room / Seat)</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.registerNumber}</td>
                    <td>{s.name}</td>
                    <td>{s.course}</td>
                    <td>
                      <span style={{ fontSize: "0.8rem", display: "block" }}>{s.examDate}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{s.examTime}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, display: "block" }}>{s.block.split(" (")[0]}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {s.floor} • {s.roomNumber} {s.seatNumber ? `• Seat ${s.seatNumber}` : ""}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => openEditModal(s)}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                          title="Edit Student Seating"
                        >
                          <Edit size={14} style={{ color: "var(--accent)" }} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="btn btn-danger"
                          style={{ padding: "0.35rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
                          title="Delete Student Seating"
                        >
                          <Trash2 size={14} style={{ color: "#fca5a5" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 2rem", border: "1px dashed rgba(255, 255, 255, 0.05)", borderRadius: "var(--radius-lg)" }}>
            <Database size={36} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
            <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>No database records found</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>Upload a CSV or Excel sheet above to populate the seating database.</p>
          </div>
        )}
      </section>

      {/* Manual Student Add/Edit Modal */}
      <AnimatePresence>
        {showStudentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="responsive-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="glass-panel responsive-modal-content"
            >
              <div style={modalHeaderStyle}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Users size={20} style={{ color: "var(--primary)" }} />
                  {editingStudent ? "Edit Student Seating Details" : "Add Manual Seating Record"}
                </h2>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="btn btn-secondary"
                  style={modalCloseBtnStyle}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} style={modalFormStyle}>
                <div style={formRowGridStyle}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Register / Enrollment No. *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formRegisterNumber}
                      onChange={(e) => setFormRegisterNumber(e.target.value)}
                      placeholder="e.g. 2301012345"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Student Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                </div>

                <div style={formRowGridStyle}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Course Code & Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formCourse}
                      onChange={(e) => setFormCourse(e.target.value)}
                      placeholder="e.g. MCS-012 Computer Org"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Exam Date *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formExamDate}
                      onChange={(e) => setFormExamDate(e.target.value)}
                      placeholder="e.g. Wednesday, June 10, 2026"
                      required
                    />
                  </div>
                </div>

                <div style={formRowGridStyle}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Exam Time / Session *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formExamTime}
                      onChange={(e) => setFormExamTime(e.target.value)}
                      placeholder="e.g. Afternoon (2:00 PM - 5:00 PM)"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Block / Building *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formBlock}
                      onChange={(e) => setFormBlock(e.target.value)}
                      placeholder="e.g. Main Block A"
                      required
                    />
                  </div>
                </div>

                <div style={formThreeRowGridStyle}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Floor *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formFloor}
                      onChange={(e) => setFormFloor(e.target.value)}
                      placeholder="e.g. First Floor"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Room Number *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formRoomNumber}
                      onChange={(e) => setFormRoomNumber(e.target.value)}
                      placeholder="e.g. Room 204"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Seat Number</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formSeatNumber}
                      onChange={(e) => setFormSeatNumber(e.target.value)}
                      placeholder="e.g. A-12 (Optional)"
                    />
                  </div>
                </div>

                <div style={modalFooterStyle}>
                  <button
                    type="button"
                    onClick={() => setShowStudentModal(false)}
                    className="btn btn-secondary"
                    style={{ minWidth: "100px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploading}
                    style={{ minWidth: "150px" }}
                  >
                    {uploading ? (
                      <>
                        <Loader size={16} className="spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Save Seating
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Announcements Panel ──────────────────────────────────────────── */}
      <section className="glass-panel" style={{ padding: "2rem", marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Megaphone size={20} style={{ color: "var(--secondary)" }} />
              Announcements Board
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Notices posted here appear live on the Student Dashboard.
            </p>
          </div>
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            <Plus size={16} />
            Post Announcement
          </button>
        </div>

        {announcementsLoading ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <Loader size={28} className="spin" style={{ color: "var(--primary)", margin: "0 auto" }} />
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 2rem", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "var(--radius-lg)" }}>
            <Bell size={32} style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }} />
            <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>No announcements yet</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>Click "Post Announcement" to create one that students will see immediately.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {announcements.map(a => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${
                    a.type === "warning" ? "rgba(245,158,11,0.2)"
                    : a.type === "success" ? "rgba(16,185,129,0.2)"
                    : "rgba(99,102,241,0.2)"
                  }`,
                  background: `${
                    a.type === "warning" ? "rgba(245,158,11,0.05)"
                    : a.type === "success" ? "rgba(16,185,129,0.05)"
                    : "rgba(99,102,241,0.05)"
                  }`,
                }}
              >
                <div style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: "0.1rem" }}>
                  {a.type === "warning" ? "⚠️" : a.type === "success" ? "✅" : "📢"}
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{a.title}</span>
                    {a.pinned && (
                      <span style={{ fontSize: "0.7rem", background: "rgba(99,102,241,0.15)", color: "#a5b4fc", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>📌 Pinned</span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{a.body}</p>
                  {a.createdAt && (
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>
                      Posted: {a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : "Just now"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(a.id)}
                  className="btn btn-danger"
                  style={{ padding: "0.35rem", borderRadius: "8px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", flexShrink: 0 }}
                  title="Delete Announcement"
                >
                  <Trash2 size={14} style={{ color: "#fca5a5" }} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnouncementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="responsive-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="glass-panel responsive-modal-content"
            >
              <div style={modalHeaderStyle}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Megaphone size={19} style={{ color: "var(--secondary)" }} />
                  Post New Announcement
                </h2>
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  className="btn btn-secondary"
                  style={modalCloseBtnStyle}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAnnouncement} style={modalFormStyle}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>Announcement Title *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={announcementTitle}
                    onChange={e => setAnnouncementTitle(e.target.value)}
                    placeholder="e.g. Hall A is Closed for Repairs"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>Message Body *</label>
                  <textarea
                    className="input-field"
                    value={announcementBody}
                    onChange={e => setAnnouncementBody(e.target.value)}
                    placeholder="Enter the full announcement message for students..."
                    rows={4}
                    required
                    style={{ resize: "vertical", minHeight: "90px" }}
                  />
                </div>

                <div style={formRowGridStyle}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Type / Severity</label>
                    <select
                      className="input-field"
                      value={announcementType}
                      onChange={e => setAnnouncementType(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="info">📢 Info (Blue)</option>
                      <option value="warning">⚠️ Warning (Amber)</option>
                      <option value="success">✅ Notice (Green)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)", paddingBottom: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={announcementPinned}
                        onChange={e => setAnnouncementPinned(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      📌 Pin to top of student dashboard
                    </label>
                  </div>
                </div>

                <div style={modalFooterStyle}>
                  <button
                    type="button"
                    onClick={() => setShowAnnouncementModal(false)}
                    className="btn btn-secondary"
                    style={{ minWidth: "100px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingAnnouncement}
                    style={{ minWidth: "160px" }}
                  >
                    {savingAnnouncement ? (
                      <><Loader size={15} className="spin" /> Posting...</>
                    ) : (
                      <><Megaphone size={15} /> Post Announcement</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded CSS class styling tricks for uploader */}
      <style dangerouslySetInnerHTML={{__html: `
        .spin {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

// Inline styling values for AdminDashboard
const containerStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "1rem 1.5rem 3rem",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: "1rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
};

const backBtnStyle = {
  padding: "0.5rem",
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "1.25rem",
};

const statCardStyle = {
  padding: "1.25rem 1.5rem",
  display: "flex",
  alignItems: "center",
  gap: "1.25rem",
};

const statLabelStyle = {
  display: "block",
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const statValueStyle = {
  display: "block",
  fontSize: "1.6rem",
  fontWeight: 800,
  color: "var(--text-primary)",
  lineHeight: 1.2,
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "1.5rem",
};

const fileDetailsContainerStyle = {
  background: "rgba(255, 255, 255, 0.01)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-lg)",
  padding: "1.5rem",
};

const fileRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  paddingBottom: "1.25rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
};

const mappingBoxStyle = {
  marginTop: "1.25rem",
};

const mappingGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1rem",
};

const mappingItemStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
};

const selectStyle = {
  width: "100%",
  fontFamily: "var(--font-primary)",
  fontSize: "0.85rem",
  padding: "0.6rem 0.8rem",
  background: "rgba(15, 23, 42, 0.6)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  outline: "none",
  cursor: "pointer",
};

const progressBoxStyle = {
  marginTop: "1.5rem",
  padding: "1rem",
  background: "rgba(99, 102, 241, 0.05)",
  border: "1px solid rgba(99, 102, 241, 0.1)",
  borderRadius: "var(--radius-md)",
};

const progressBarBgStyle = {
  height: "6px",
  background: "rgba(255, 255, 255, 0.05)",
  borderRadius: "3px",
  overflow: "hidden",
};

const progressBarFillStyle = {
  height: "100%",
  background: "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)",
  transition: "width 0.3s ease",
};

const statusFeedbackStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginTop: "1.5rem",
  padding: "0.75rem 1rem",
  background: "rgba(255, 255, 255, 0.02)",
  border: "1px solid",
  borderRadius: "var(--radius-md)",
};

const qrWrapperStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1.5rem",
  flexGrow: 1,
};

const qrContainerStyle = {
  padding: "1rem",
  background: "white",
  borderRadius: "var(--radius-md)",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
};

const dbSearchContainerStyle = {
  position: "relative",
  minWidth: "220px",
};

const dbSearchIconStyle = {
  position: "absolute",
  left: "0.75rem",
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--text-secondary)",
};

const dbSearchInputStyle = {
  width: "100%",
  fontFamily: "var(--font-primary)",
  fontSize: "0.85rem",
  padding: "0.5rem 0.8rem 0.5rem 2.2rem",
  background: "rgba(15, 23, 42, 0.4)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  outline: "none",
};

// Modal styles
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(3, 8, 12, 0.85)",
  backdropFilter: "blur(12px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "1.5rem"
};

const modalContentStyle = {
  width: "100%",
  maxWidth: "680px",
  padding: "2.5rem",
  background: "linear-gradient(135deg, rgba(8, 22, 33, 0.95) 0%, rgba(3, 10, 15, 0.99) 100%)",
  border: "1px solid var(--border-glow)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85)"
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.5rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  paddingBottom: "0.75rem"
};

const modalCloseBtnStyle = {
  padding: "0.4rem",
  borderRadius: "50%",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "auto"
};

const modalFormStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem"
};

const formRowGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "1.25rem"
};

const formThreeRowGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "1.25rem"
};

const modalFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "1rem",
  marginTop: "1.5rem",
  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  paddingTop: "1.25rem"
};
