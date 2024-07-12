// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


interface IRouter {
    function WETH() external pure returns (address);

    function getAmountsOut(
        uint amountIn, 
        address[] memory path
        ) external view returns (uint[] memory amounts);
    
    function getAmountsIn(uint amountOut, address[] memory path) external view returns (uint[] memory amounts);
}


contract XTAPresale is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Struct for presale tier
    struct Tier {
        uint256 maxTokens;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
        uint256 soldTokens;
    }

    // Constants
    uint256 private constant TOKEN_DECIMAL = 1e18;
    uint256 private constant VSG_DECIMAL = 1e18;
    uint256 private constant USDT_DECIMAL = 1e6;
    uint256 private constant MAX_TIER = 3;
    EnumerableSet.AddressSet private whiteListAddress;

    // Variables
    uint256 public activeTier;
    bool public isAutomoveTier;

    Tier[] public tiers;

    IERC20 public VSG;
    IERC20 public USDT;
    IRouter public router;

    // Address arrays and mappings for tracking user purchases
    address[][MAX_TIER] internal buyersInTiers;
    mapping (address => uint256)[MAX_TIER] internal userPaidUSD;
    mapping (address => uint256)[MAX_TIER] internal userPaidVSG;

    // Events
    event Buy(address indexed _buyer, uint256 _amount, uint256 _tierNum);
    event Burn(uint256 _amount, uint256 _tierNum);
    event SetStartAndEndTime(uint256 _startTime, uint256 _endTime, uint256 _tierNum);
    event SetEndTime(uint256 _time, uint256 _tierNum);

    // functions
    constructor(address _router, address _vsg, address _usdt) {
        VSG = IERC20(_vsg);
        USDT = IERC20(_usdt);
        router = IRouter(_router);

		// Initialize presale tiers
        addTier(200_000_000, 60);   // 200 million tokens, $0.00006, 5 days
        addTier(300_000_000, 75);   // 300 million tokens, $0.000075, 10 days
        addTier(500_000_000, 90);   // 500 million tokens, $0.00009, 15 days
    }

    function addToWhiteList(address walletAddress) public onlyOwner {
        EnumerableSet.add(whiteListAddress, walletAddress);
    }

    function addAllToWhiteList(address[] memory walletAddresses) external onlyOwner {
        for (uint256 i = 0; i < walletAddresses.length; i++) {
            addToWhiteList(walletAddresses[i]);
        }
    }

    function removeFromWhiteList(address walletAddress) external onlyOwner {
        EnumerableSet.remove(whiteListAddress, walletAddress);
    }

    function getWhiteList() public view returns(address[] memory) {
        uint256 length = EnumerableSet.length(whiteListAddress);
        address[] memory addresses = new address[](length);
        for (uint256 i = 0; i < length; ++i) {
            addresses[i] = EnumerableSet.at(whiteListAddress, i);
        }
        return addresses;
    }

    // Function to add a new presale tier
    function addTier(uint256 _maxTokens, uint256 _price) private {
        require(tiers.length < MAX_TIER, "addTier: Tier count overflow");

        tiers.push(Tier({
            maxTokens: _maxTokens * TOKEN_DECIMAL,
            price: _price,
            startTime: 0,
            endTime: 0,
            soldTokens: 0
        }));
    }

    function getTimeStamp() public view returns (uint256) {
        return block.timestamp;
    }

    /**
    * @notice Buy tokens with VSG.
    */
    function buyTokensWithVSG(uint256 _vsgAmount) external nonReentrant {
        require(EnumerableSet.contains(whiteListAddress, msg.sender), "Not a whitelisted factory");
        require(activeTier < MAX_TIER, "buyTokensWithVSG: Invalid Tier");

        // Retrieve tier details
        Tier storage currentTier = tiers[activeTier];
        uint256 maxTokens = currentTier.maxTokens;
        uint256 price = currentTier.price;
        uint256 startTime = currentTier.startTime;
        uint256 endTime = currentTier.endTime;
        uint256 soldTokens = currentTier.soldTokens;

        // Validate presale conditions
        require(_vsgAmount > 0, "buyTokensWithVSG: Insufficient VSG amount");
        require(block.timestamp >= startTime && block.timestamp < endTime, "buyTokensWithVSG: Not presale period");

        // Calculate equivalent USD amount based on VSG price
        uint256 usdtAmount = getLatestVSGPrice(_vsgAmount);

        // Variables for handling max token purchase and refund scenarios
        bool isReachedMaxAmount;
        uint256 buyTokenAmt = _vsgAmount;

        // Adjust purchase amount if exceeding max tokens and automove tier is enabled
        if (currentTier.maxTokens < buyTokenAmt + soldTokens && isAutomoveTier) {
            uint256 realBuyTokenAmt = maxTokens - soldTokens;

            _vsgAmount = _vsgAmount * realBuyTokenAmt / buyTokenAmt;
            buyTokenAmt = realBuyTokenAmt;
            isReachedMaxAmount = true;
        }

        IERC20(VSG).safeTransferFrom(msg.sender, address(this), _vsgAmount);

        // Track user VSG purchases
        if (userPaidUSD[activeTier][msg.sender] == 0)
            buyersInTiers[activeTier].push(msg.sender);

        userPaidUSD[activeTier][msg.sender] += usdtAmount;
        userPaidVSG[activeTier][msg.sender] += _vsgAmount;

        // Update sold tokens for the current tier
        currentTier.soldTokens += buyTokenAmt;

        // Emit Buy event
        emit Buy(msg.sender, buyTokenAmt, activeTier);

        // Move to next tier if max token amount reached
        if (isReachedMaxAmount)
            activeTier++;
    }

    /**
    * @dev Get latest VSG price from dex.
    * @param _amount VSG amount.
    */
    function getLatestVSGPrice(uint256 _amount) public pure returns (uint256) {
        // address[] memory path = new address[](3);
        // path[0] = address(VSG);
        // path[1] = address(router.WETH());
        // path[2] = address(USDT);

        // uint256[] memory price_out = router.getAmountsOut(_amount, path);
        // return price_out[2] / USDT_DECIMAL * USDT_DECIMAL;
        uint256 price_out = _amount * 1116 / VSG_DECIMAL;
        return price_out;
    }

    /**
    * @dev Get buyers in specified tier.
    * @param _tierNum Number of tier.
    */
    function getBuyersInTier(uint256 _tierNum) external view returns (address[] memory) {
        require(_tierNum < MAX_TIER, "getBuyersInTier: Invalid Tier");
        return buyersInTiers[_tierNum];
    }

    /**
    * @dev Get paid usdt of a user on specified tier.
    * @param _account User address.
    * @param _tierNum Number of tier.
    */
    function getUserPaidUSDT(uint256 _tierNum, address _account) public view returns (uint256) {
        require(_tierNum < MAX_TIER, "getUserPaidUSDT: Invalid Tier");
        return userPaidUSD[_tierNum][_account];
    }

    /**
    * @dev Get paid vsg of a user on specified tier.
    * @param _account User address.
    * @param _tierNum Number of tier.
    */
    function getUserPaidVSG(uint256 _tierNum, address _account) public view returns (uint256) {
        require(_tierNum < MAX_TIER, "getUserPaidVSG: Invalid Tier");
        return userPaidVSG[_tierNum][_account];
    }

    /**
    * @dev Set start and end time of a tier.
    * @param _tierNum Number of tier.
    * @param _startTime Start time of a tier.
    * @param _endTime End time of a tier.
    */
    function setStartAndEndTime(uint256 _tierNum, uint256 _startTime, uint256 _endTime) external onlyOwner {
        require(_tierNum < MAX_TIER, "setStartAndEndTime: Invalid Tier");

        tiers[_tierNum].startTime = _startTime;
        tiers[_tierNum].endTime = _endTime;
        emit SetStartAndEndTime(_startTime, _endTime, _tierNum);
    }

    /**
    * @dev Set end time of a tier.
    * @param _tierNum Number of tier.
    * @param _time End time of a tier.
    */
    function setEndTime(uint256 _tierNum, uint256 _time) external onlyOwner {
        require(_tierNum < MAX_TIER, "setEndTime: Invalid Tier");
        
        tiers[_tierNum].endTime = _time;
        emit SetEndTime(_time, _tierNum);
    }

    /**
    * @dev Set active tier.
    * @param _tierNum Number of tier.
    * @param _isAutoPhase Auto move tier, TRUE: Auto move to next tier if a tier end.
    */
    function setActivePhase(uint256 _tierNum, bool _isAutoPhase) external onlyOwner {
        require(_tierNum < MAX_TIER, "setActivePhase: Invalid Tier");

        activeTier = _tierNum;
        isAutomoveTier = _isAutoPhase;
    }

    /**
    * @notice Withdraw tokens.
    * @dev Withdraw tokens from this contract.
    * @param _amount Amount of the token to withdraw.
    */
    function withdraw(uint256 _amount) external onlyOwner {
        IERC20(VSG).safeTransfer(owner(), _amount);
    }
}
