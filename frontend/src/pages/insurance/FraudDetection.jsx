import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { contract, web3 } from "../../config/blockchain";

const FraudDetection = () => {
  const [patientAddress, setPatientAddress] = useState("");
  const [recordHash, setRecordHash] = useState("");
  const [isAuthentic, setIsAuthentic] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();

    if (!patientAddress || !recordHash) {
      toast.error("Please enter both fields");
      return;
    }

    try {
      setLoading(true);
      // Fetch patient records from blockchain
      const records = await contract.methods.getRecords(patientAddress).call();

      // Check if recordHash exists in patient's records
      const match = records.find((r) => r.recordHash === recordHash);

      if (match) {
        setIsAuthentic(true);
        toast.success("Record is authentic ✅");
      } else {
        setIsAuthentic(false);
        toast.error("Record may be fraudulent ❌");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-red-600">Fraud Detection</h1>
      <form
        className="max-w-lg bg-white p-6 rounded shadow space-y-4"
        onSubmit={handleCheck}
      >
        <div>
          <label className="block text-gray-700 font-medium mb-2">Patient Address</label>
          <input
            type="text"
            placeholder="Enter patient address"
            value={patientAddress}
            onChange={(e) => setPatientAddress(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">Record Hash</label>
          <input
            type="text"
            placeholder="Enter record hash"
            value={recordHash}
            onChange={(e) => setRecordHash(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          disabled={loading}
        >
          {loading ? "Checking..." : "Check Record"}
        </button>
      </form>

      {isAuthentic !== null && (
        <div
          className={`mt-6 p-4 rounded text-white text-center ${
            isAuthentic ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {isAuthentic ? "✅ Record is Authentic" : "❌ Record may be Fraudulent"}
        </div>
      )}
    </div>
  );
};

export default FraudDetection;