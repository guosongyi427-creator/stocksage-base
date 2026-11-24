// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title StockSage ResearchRegistry
/// @notice A public, permissionless registry where an AI research agent (or anyone)
///         anchors a content hash of a tokenized-stock research brief on Base.
///         Each anchor is a real on-chain transaction: the brief itself lives off-chain
///         (dashboard + JSON), and the hash on-chain proves what was published, when,
///         and by whom. Anyone can anchor a brief; anyone can verify one.
/// @dev Deployed on Base Sepolia (testnet) for the Base Stocks Maxxing Season.
///      No token, no fees beyond gas, no admin, no upgradeability.
contract ResearchRegistry {
    struct Brief {
        bytes32 contentHash; // keccak256 of the canonical brief JSON
        string symbol;       // tokenized-stock symbol, e.g. "NVDAc"
        int32 score;         // agent score, -100 (strong avoid) .. +100 (strong watch)
        uint64 timestamp;    // block timestamp of the anchor
        address author;      // address that anchored the brief
    }

    Brief[] public briefs;
    mapping(bytes32 => bool) public anchored;

    event BriefAnchored(
        uint256 indexed id,
        bytes32 indexed contentHash,
        string symbol,
        int32 score,
        address indexed author,
        uint64 timestamp
    );

    /// @notice Anchor a research brief. Reverts if the same content hash was anchored before.
    function anchorBrief(
        bytes32 contentHash,
        string calldata symbol,
        int32 score
    ) external returns (uint256 id) {
        require(!anchored[contentHash], "ResearchRegistry: already anchored");
        require(score >= -100 && score <= 100, "ResearchRegistry: score out of range");
        require(bytes(symbol).length > 0, "ResearchRegistry: empty symbol");
        id = briefs.length;
        briefs.push(
            Brief({
                contentHash: contentHash,
                symbol: symbol,
                score: score,
                timestamp: uint64(block.timestamp),
                author: msg.sender
            })
        );
        anchored[contentHash] = true;
        emit BriefAnchored(id, contentHash, symbol, score, msg.sender, uint64(block.timestamp));
    }

    function briefCount() external view returns (uint256) {
        return briefs.length;
    }

    function getBrief(uint256 id) external view returns (Brief memory) {
        require(id < briefs.length, "ResearchRegistry: out of range");
        return briefs[id];
    }
}
