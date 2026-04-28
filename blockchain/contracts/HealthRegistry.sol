// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HealthRegistry
 * @dev A simple contract to log medical record IPFS hashes on-chain
 * @notice This contract stores immutable references to medical records stored on IPFS
 */
contract HealthRegistry {

    // Structure to store record metadata
    struct RecordEntry {
        string ipfsHash;        // IPFS CID of the medical record
        string patientId;       // MongoDB ObjectId of the patient
        address uploadedBy;     // Address that logged this record
        uint256 timestamp;      // Block timestamp when logged
        string recordType;      // Type of medical record
    }

    // Array of all record entries
    RecordEntry[] public records;

    // Mapping from patientId to their record indices
    mapping(string => uint256[]) private patientRecords;

    // Mapping from ipfsHash to record index (for lookup)
    mapping(string => uint256) private hashToIndex;
    mapping(string => bool) private hashExists;

    // Events
    event RecordLogged(
        uint256 indexed recordIndex,
        string indexed ipfsHash,
        address indexed uploadedBy,
        string patientId,
        uint256 timestamp,
        string recordType
    );

    /**
     * @dev Log a new medical record to the blockchain
     * @param _ipfsHash The IPFS CID of the uploaded file
     * @param _patientId The patient's identifier (MongoDB ObjectId)
     * @param _recordType Type of medical record (e.g., "Prescription", "Lab Report")
     */
    function logRecord(
        string memory _ipfsHash,
        string memory _patientId,
        string memory _recordType
    ) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_patientId).length > 0, "Patient ID cannot be empty");
        require(!hashExists[_ipfsHash], "Record already logged");

        uint256 recordIndex = records.length;

        RecordEntry memory newRecord = RecordEntry({
            ipfsHash: _ipfsHash,
            patientId: _patientId,
            uploadedBy: msg.sender,
            timestamp: block.timestamp,
            recordType: _recordType
        });

        records.push(newRecord);
        patientRecords[_patientId].push(recordIndex);
        hashToIndex[_ipfsHash] = recordIndex;
        hashExists[_ipfsHash] = true;

        emit RecordLogged(
            recordIndex,
            _ipfsHash,
            msg.sender,
            _patientId,
            block.timestamp,
            _recordType
        );

        return recordIndex;
    }

    /**
     * @dev Get a record by its index
     * @param _index The index of the record
     */
    function getRecord(uint256 _index) external view returns (
        string memory ipfsHash,
        string memory patientId,
        address uploadedBy,
        uint256 timestamp,
        string memory recordType
    ) {
        require(_index < records.length, "Record does not exist");
        RecordEntry memory record = records[_index];
        return (
            record.ipfsHash,
            record.patientId,
            record.uploadedBy,
            record.timestamp,
            record.recordType
        );
    }

    /**
     * @dev Get record by IPFS hash
     * @param _ipfsHash The IPFS CID to look up
     */
    function getRecordByHash(string memory _ipfsHash) external view returns (
        string memory patientId,
        address uploadedBy,
        uint256 timestamp,
        string memory recordType
    ) {
        require(hashExists[_ipfsHash], "Record not found");
        uint256 index = hashToIndex[_ipfsHash];
        RecordEntry memory record = records[index];
        return (
            record.patientId,
            record.uploadedBy,
            record.timestamp,
            record.recordType
        );
    }

    /**
     * @dev Get all record indices for a patient
     * @param _patientId The patient's identifier
     */
    function getPatientRecordIndices(string memory _patientId) external view returns (uint256[] memory) {
        return patientRecords[_patientId];
    }

    /**
     * @dev Get the total number of records
     */
    function getTotalRecords() external view returns (uint256) {
        return records.length;
    }

    /**
     * @dev Check if a hash has been logged
     * @param _ipfsHash The IPFS CID to check
     */
    function isRecordLogged(string memory _ipfsHash) external view returns (bool) {
        return hashExists[_ipfsHash];
    }
}
