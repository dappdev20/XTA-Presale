// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestVSGToken is ERC20, Ownable {
    constructor() ERC20("TestVSG", "TestVSG") Ownable(msg.sender) {
        uint256 totalSupply = 1_000_000_000 * 10 ** decimals();
        _mint(msg.sender, totalSupply);
    }
}
