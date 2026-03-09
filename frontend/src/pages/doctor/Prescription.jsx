import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
//import { contract, web3 } from "../config/blockchain";

const Prescription = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [recordHash, setRecordHash] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch all patients
  const fetchPatients = async () => {
    try {
      const accounts = await web3.eth.getAccounts();
      const patientList = [];

      for (let addr of accounts) {
        const user = await contract.methods.getUser(addr).call();
        if (parseInt(user[1]) === 0) { // Role.Patient = 0
          patientList.push({ address: addr, name: user[0] });
        }
      }

      setPatients(patientList);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch patients");
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Add prescription record
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !recordHash) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      const accounts = await web3.eth.getAccounts();
      const tx = await contract.methods
        .addRecord(selectedPatient, recordHash)
        .send({ from: accounts[0] });
      console.log(tx);
      toast.success("Prescription added successfully!");
      setRecordHash("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add prescription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Add Prescription</h1>
      <form
        className="max-w-lg bg-white p-6 rounded shadow space-y-4"
        onSubmit={handleSubmit}
      >
        <div>
          <label className="block text-gray-700 font-medium mb-2">Select Patient</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          >
            <option value="">-- Select Patient --</option>
            {patients.map((p) => (
              <option key={p.address} value={p.address}>
                {p.name} ({p.address.substring(0, 6)}...)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Prescription Record Hash (IPFS)
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={recordHash}
            onChange={(e) => setRecordHash(e.target.value)}
            placeholder="Enter IPFS hash"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Prescription"}
        </button>
      </form>
    </div>
  );
};

export default Prescription;