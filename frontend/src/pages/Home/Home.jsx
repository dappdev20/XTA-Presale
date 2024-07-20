import React, { useState, useEffect, useMemo } from "react";
import { Link } from 'react-router-dom'
import { toast } from "react-toastify";
import { useSelector } from 'react-redux'
import { useDebounce } from 'use-debounce';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules'
import 'swiper/css';
import {
    useAccount,
    useNetwork,
    useWalletClient,
    useContractRead,
    useSwitchNetwork
} from 'wagmi';
import { formatUnits, parseUnits, parseEther, formatEther } from "viem";
import { mainnet, sepolia } from 'wagmi/chains';
import { readContract, waitForTransaction, writeContract, prepareWriteContract } from '@wagmi/core'
import { Backdrop, CircularProgress } from "@mui/material";
import Web3 from "web3";
import { 
    BrowserProvider, 
    Contract
} from "ethers";
import detectEthereumProvider from '@metamask/detect-provider';

import pix1 from "../../images/home/pix1.png"
import pix2 from "../../images/home/pix2.png"
import pix3 from "../../images/home/pix3.png"
import pix4 from "../../images/home/pix4.png"
import usdt from "../../images/home/usdt.png"
import subcoin from "../../images/home/subcoin.png"
import supelle from "../../images/home/supelle.png"
import greenDollar from '../../images/home/greenDollar.png'
import eth from '../../images/home/eth.png'
import iconBlue from "../../images/home/iconBlue.png"
import VSG from "../../images/home/VSG.png"
import XETA from "../../images/home/XTA Logo.jpg"

import { Button, Hero, Section } from '../../Utilities'
import { formatTimestampToDateString } from '../../common/methods'
import TokenABI from "../../chain_interaction/SupCoin.json";
import PresalePlatformABI from "../../chain_interaction/PresalePlatform.json";
import { confirmTransactionReceipt, confirmTransactionReceiptBSC } from '../../chain_interaction/client';
import { socket } from "../../App";

// Import Swiper styles
import "./Home.css"

const web3 = new Web3(window.ethereum)
const buyModes = ["byETH", "byVSG"];
const definedPresalePrices = [0.006, 0.0075, 0.009];
let approveData = false;

function Home() {
    const { isLoading: isSwitchingLoading, switchNetwork } = useSwitchNetwork()
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { chain } = useNetwork();
    const ethPrice = useSelector(state => state.price.ethPrice || 0);
    const usdtPrice = useSelector(state => state.price.usdtPrice || 0);

    const [maxAmountOfPhase, setMaxAmountOfPhase] = useState(0);
    const [soldAmountOfPhase, setSoldAmountOfPhase] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(process.env.REACT_APP_XTA_PRESALE_END_DATE);
    const [minPerWalletOfPhase, setMinPerWalletOfPhase] = useState(0);
    const [maxPerWalletOfPhase, setMaxPerWalletOfPhase] = useState(0);

    const [buyMode, setBuyMode] = useState(buyModes[1]);
    const [countdown, setCountDown] = useState(0);
    const [inputAmount, setInputAmount] = useState(0);
    const [inputTierNum, setInputTierNum] = useState(1);
    const [inputWhiteList, setInputWhiteList] = useState("");
    const date = new Date();
    const formatDate = (date) => {
        var month = '' + (date.getMonth() + 1);
        var day = '' + date.getDate();
        var year = date.getFullYear();
    
        if (month.length < 2) 
            month = '0' + month;
        if (day.length < 2) 
            day = '0' + day;
    
        return [year, month, day].join('-');
    }
    const [inputStartDate, setInputStartDate] = useState(formatDate(date));
    const [inputEndDate, setInputEndDate] = useState(formatDate(date));
    const [outputAmount, setOutputAmount] = useState(0);
    const [inputWithdrawAmount, setInputWithdrawAmount] = useState(0);
    const [debouncedInputAmount] = useDebounce(inputAmount, 100);
    const [working, setWorking] = useState(false);
    const [targetDate, setTargetDate] = useState(new Date(process.env.REACT_APP_XTA_PRESALE_END_DATE * 1000));
    const [approvingTxHash, setApprovingTxHash] = useState("");
    const [presaleTxHash, setPresaleTxHash] = useState("");
    const [presalePriceOfPhase, setPresalePriceOfPhase] = useState(0);
    const chainId = 11155111;

    const VSGContract = new web3.eth.Contract(TokenABI, process.env.REACT_APP_VSG_ADDRESS);

    useEffect(() => {
        const interval = setInterval(() => {
            const timeRemaining = getTimeRemaining(targetDate);
            setCountDown(timeRemaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    const getTimeRemaining = (targetDate) => {
        const now = new Date();
        const timeDifference = targetDate.getTime() - now.getTime();

        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds };
    };

    useEffect(() => {
        const xtaAmount = buyMode === "byETH" ?
            debouncedInputAmount * ethPrice / parseFloat(presalePriceOfPhase || (definedPresalePrices[0] / 100)) :
            buyMode === "byVSG" ?
                debouncedInputAmount * Number(vsgPrice) / 1e6 / parseFloat(presalePriceOfPhase || (definedPresalePrices[0] / 100))
                :
                    Math.floor(debouncedInputAmount / parseFloat(presalePriceOfPhase || (definedPresalePrices[0] / 100)));
        setOutputAmount(xtaAmount);
    }, [debouncedInputAmount]);

    const { data: currentPhaseIndex } = useContractRead({
        address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
        abi: PresalePlatformABI,
        functionName: 'activeTier',
        enabled: true,
        watch: true,
        chainId: chainId
    });

    const { data: activePhaseStatus } = useContractRead({
        address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
        abi: PresalePlatformABI,
        functionName: 'tiers',
        enabled: true,
        args: [currentPhaseIndex],
        watch: true,
        chainId: chainId
    })

    const { data: userPaidUSDT } = useContractRead({
        address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
        abi: PresalePlatformABI,
        functionName: 'getUserPaidUSDT',
        args: [currentPhaseIndex, address],
        enabled: true,
        watch: true,
        chainId: chainId
    });

    const { data: userPaidVSG } = useContractRead({
        address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
        abi: PresalePlatformABI,
        functionName: 'getUserPaidVSG',
        args: [currentPhaseIndex, address],
        enabled: true,
        watch: true,
        chainId: chainId
    });

    const { data: vsgPrice } = useContractRead({
        address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
        abi: PresalePlatformABI,
        functionName: 'getLatestVSGPrice',
        args: [1e18],
        enabled: true,
        watch: true,
        chainId: chainId
    });

    const { data: ownerAddress } = useContractRead({
        address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
        abi: PresalePlatformABI,
        functionName: 'owner',
        chainId: chainId
    });

    useEffect(() => {
        if (!activePhaseStatus) return;
        setMaxAmountOfPhase(formatEther(activePhaseStatus[0]?.toString()));
        setPresalePriceOfPhase(formatUnits(activePhaseStatus[1]?.toString(), 6));
        setStartTime(activePhaseStatus[2]);
        setEndTime(activePhaseStatus[3]);
        setSoldAmountOfPhase(formatEther(activePhaseStatus[4]?.toString()));
        if (Number(activePhaseStatus[3]) != 0) {
            if (new Date().getTime() <= new Date(parseInt(activePhaseStatus[2]) * 1000).getTime())
                setTargetDate(new Date(parseInt(activePhaseStatus[2]) * 1000));
            else
                setTargetDate(new Date(parseInt(activePhaseStatus[3]) * 1000));
        }

        setInputStartDate(formatDate(new Date(parseInt(activePhaseStatus[2]) * 1000)));
        setInputEndDate(formatDate(new Date(parseInt(activePhaseStatus[3]) * 1000)));
    }, [activePhaseStatus]);

    const onClickBuy = async () => {
        if (isConnected !== true) {
            toast.warning("Connect your wallet!");
            return;
        }
        if (outputAmount <= 0) {
            toast.warning("Invalid amount!");
            return;
        }

        if (new Date().getTime() <= new Date(parseInt(startTime) * 1000).getTime() || new Date().getTime() >= new Date(parseInt(endTime) * 1000).getTime()) {
            toast.warning("No Presale Period!");
            return;       
        }
        
        try {
            if (buyMode === buyModes[0]) {
                if (chain.id !== chainId) {
                    toast.warning("This platform works on Goerli network for ETH payment. Please change the network of your wallet into Goerli and try again. ");
                    return;
                }

                if (parseFloat(debouncedInputAmount * parseFloat(ethPrice)) > parseFloat(maxPerWalletOfPhase)) {
                    toast.warn(`In this phrase of presale, maximum is ${Number(parseFloat(ethPrice) / parseFloat(maxPerWalletOfPhase)).toFixed(2)} ETH (${parseInt(maxPerWalletOfPhase)} USDT). Please input valid amount and try again.`)
                    return;
                }
                if (parseFloat(debouncedInputAmount * parseFloat(ethPrice)) < parseFloat(minPerWalletOfPhase)) {
                    toast.warn(`In this phrase of presale, minimum is ${Number(parseFloat(ethPrice) / parseFloat(minPerWalletOfPhase)).toFixed(2)} ETH (${parseInt(minPerWalletOfPhase)} USDT). Please input valid amount and try again.`)
                    return;
                }
                setWorking(true);

                const presaleHash = await walletClient.writeContract({
                    address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
                    abi: PresalePlatformABI,
                    functionName: 'buyTokensWithETH',
                    value: parseEther(debouncedInputAmount !== undefined && debouncedInputAmount?.toString()),
                });
                setPresaleTxHash(presaleHash);
            }

            if (buyMode === buyModes[1]) {
                if (chain.id !== chainId) {
                    toast.warning("This platform works on Sepolia Testnet network for VSG payment. Please change the network of your wallet into Sepolia Testnet and try again. ");
                    return;
                }

                setWorking(true);
                
                const isWhiteListed = await readContract({
                    address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
                    abi: PresalePlatformABI,
                    functionName: 'isWhiteListed',
                    args: [address],
                })
                if (!isWhiteListed) {
                    setWorking(false);
                    toast.warning("You are not in whitelist.");
                    return;
                }

                if (!approveData) {
                    const allowance = await readContract({
                        address: process.env.REACT_APP_VSG_ADDRESS,
                        abi: TokenABI,
                        functionName: 'allowance',
                        args: [address, process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS],
                    })
                    if (parseFloat(formatUnits(allowance !== undefined && allowance?.toString(), 18)) < parseFloat(outputAmount)) {
                        // const config = await prepareWriteContract({
                        //     address: process.env.REACT_APP_VSG_ADDRESS,
                        //     chainId: chain.id,
                        //     abi: TokenABI,
                        //     functionName: "approve",
                        //     args: [process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS, parseUnits(debouncedInputAmount !== undefined && debouncedInputAmount?.toString(), 18)], 
                        //     wallet: address,
                        // });
                        // const aproveHash = await writeContract(config);
                        // setApprovingTxHash(aproveHash.hash);
                        // const waitHash = await waitForTransaction({
                        //     hash: aproveHash,
                        // });

                        const browserProvider = await detectEthereumProvider();
                        const provider = new BrowserProvider(browserProvider);

                        const accounts = await browserProvider.request({
                            method: 'eth_requestAccounts',
                        });

                        const aproveHash = await VSGContract.methods.approve(process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS, parseUnits(debouncedInputAmount !== undefined && debouncedInputAmount?.toString(), 18)).send({
                            from: address
                        });
                        console.log('[DM] approvehash = ', aproveHash);
                        toast.success("approvehash!!!");
                        setApprovingTxHash(aproveHash.transactionHash);
                        setWorking(false);
                    }

                } else if (approveData) {
                    const config = await prepareWriteContract({
                        address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
                        chainId: chain.id,
                        abi: PresalePlatformABI,
                        functionName: 'buyTokensWithVSG',
                        args: [parseUnits(debouncedInputAmount !== undefined && debouncedInputAmount?.toString(), 18)],
                     });
                    const presaleHash = await writeContract(config);

                    setPresaleTxHash(presaleHash.hash);

                    // const waitHash = await waitForTransaction({
                    //     hash: presaleHash,
                    // });
                }
                // setPresaleTxHash(presaleHash);
                
            }
        } catch (err) {
            setWorking(false);
            if (approvingTxHash) {
                setApprovingTxHash(null);
            }
                
            else if (presaleTxHash) {
                setPresaleTxHash(null);
            }
            console.error(err);
        }
    }

    const getButtonText = () => {
        if (approveData) {
            return "Confirming...";
        } else if (approvingTxHash) {
            return "Approving...";
        }
        return "Buy with VSG";
      }

    const onClickWithdraw = async () => {
        const presaleHash = await walletClient.writeContract({
            address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
            abi: PresalePlatformABI,
            functionName: 'withdraw',
            args: [parseUnits(inputWithdrawAmount !== undefined && inputWithdrawAmount?.toString(), 18)],

        });
    }

    useEffect(() => {
        getButtonText();
        (async () => {
            if (approvingTxHash) {
                approveData = true;
                // setTimeout(async () => {
                //     try {
                //         const receipt = await confirmTransactionReceipt(approvingTxHash);
                //         console.log(receipt);
                //         setApprovingTxHash(null);
                //         toast.success("You've approved your VSG to presale contract!");
                //         setWorking(false);
                //         approveData = true;
                //     } catch (err) {
                //         setWorking(false);
                //         setApprovingTxHash(null);
                //         console.log(err);
                //         approveData = false;
                //     }
                // }, 3000);
            }
            if (presaleTxHash) {
                setTimeout(async () => {
                    try {
                        const receipt = await confirmTransactionReceipt(presaleTxHash);
                        console.log(receipt);
                        setInputAmount(0);
                        setOutputAmount(0);
                        setWorking(false);
                        setPresaleTxHash(null);
                        setApprovingTxHash(null);
                        toast.success("You've successfully bought XTA coins.");
                        approveData = false;
                    } catch (err) {
                        setWorking(false);
                        setApprovingTxHash(null);
                        setPresaleTxHash(null);
                        console.log(err);
                    }
                }, 3000);
            }
        })()
    }, [approvingTxHash, presaleTxHash])

    const onChangeInputAmount = (value) => {
        setInputAmount(parseFloat(value));
    }

    const onChangeInputTierNum = (value) => {
        setInputTierNum(parseFloat(value));
    }

    const onChangeInputStartDate = (value) => {
        setInputStartDate(value);
    }

    const onChangeInputEndDate = (value) => {
        setInputEndDate(value);
    }

    const onClickSetDate = async () => {
        if (chain.id !== chainId) {
            toast.warning("This platform works on Sepolia Testnet network. Please change the network of your wallet into Sepolia Testnet and try again.");
            return;
        }
        const startDate = new Date(inputStartDate).getTime() / 1000;
        const endDate = new Date(inputEndDate).getTime() / 1000;
        const presaleHash = await walletClient.writeContract({
            address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
            abi: PresalePlatformABI,
            functionName: 'setStartAndEndTime',
            // args: [currentPhaseIndex, process.env.REACT_APP_XTA_PRESALE_START_DATE, process.env.REACT_APP_XTA_PRESALE_END_DATE],
            args: [inputTierNum - 1, startDate, endDate],
        });

        setTargetDate(new Date(endDate * 1000));
    }

    const onChangeInputWithdrawAmount = (value) => {
        setInputWithdrawAmount(parseFloat(value));
    }

    const switchToChain = (targetChainId) => {
        if (isConnected !== true) {
            toast.warn("Please connect your wallet and try again.");
            return;
        }
        if (targetChainId !== chain?.id) {
            switchNetwork(targetChainId);
        }
    }

    const onChangeInputWhiteList = (value) => {
        setInputWhiteList(value);
    }

    const onClickSetWhitelist = async () => {
        if (isConnected !== true) {
            toast.warning("Connect your wallet!");
            return;
        }
        if (chain.id !== chainId) {
            toast.warning("This platform works on Sepolia Testnet network. Please change the network of your wallet into Sepolia Testnet and try again.");
            return;
        }
        
        const waddress = inputWhiteList.split(/\r?\n/);
        if (waddress.length > 0) {
            setWorking(true);
            const whitelistHash = await walletClient.writeContract({
                address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
                abi: PresalePlatformABI,
                functionName: 'addAllToWhiteList',
                args: [waddress],
            });
            setWorking(false);
        }
    }

    return (
        <>
            <div id={"home"}>
                {/* Hero Backgrounds */}
                <Swiper
                    modules={[Autoplay]}
                    spaceBetween={0}
                    slidesPerView={"auto"}
                    autoplay={{ delay: 100000 }}
                    speed={1000}
                    loop={"true"}
                    className='w-100 h-100 position-absolute'
                >
                    <SwiperSlide className='w-100 h-100'>
                        <div className="hero-bg hero-bg1">
                            <div className="display"></div>
                        </div>
                    </SwiperSlide>
                </Swiper>

                <Hero centerContent={true} expand={true} className={"container-fluid justify-center"} >
                    <div className="row w-100 mx-auto justify-content-between align-items-center">
                        <div className="col-12 col-sm-10 col-md-6 col-lg-5 col-xl-4 mx-auto">
                            <div className="buy-section text-center text-light ml-md-auto">
                                <h6 className="bold">SECURE YOUR PURCHASE BEFORE PRICE INCREASE!</h6>
                                <h6 className="text-primary mt-3 bold">SALE {
                                    new Date().getTime() <= new Date(parseInt(startTime) * 1000).getTime() ?
                                        "STARTS" :
                                        new Date().getTime() <= new Date(parseInt(endTime) * 1000).getTime() ?
                                            "ENDS" : ""
                                } IN</h6>

                                <div className="count-down d">
                                    <div className="time">
                                        <h3 className='m-0 bold'>{countdown.days}</h3>
                                        <p className='m-0'>Days </p>
                                    </div>
                                    <div className="time bold">
                                        <h3 className='m-0 bold'>{countdown.hours}</h3>
                                        <p className='m-0'>Hours</p>
                                    </div>
                                    <div className="time">
                                        <h3 className='m-0 bold'>{countdown.minutes}</h3>
                                        <p className='m-0'>Minutes</p>
                                    </div>
                                    <div className="time">
                                        <h3 className='m-0 bold'>{countdown.seconds}</h3>
                                        <p className='m-0'>Seconds</p>
                                    </div>
                                </div>

                                <div className="CARD bg-success">
                                    <div className="inner-card "
                                        style={{
                                            width: parseInt(endTime) - new Date().getTime() / 1000 > 0 ? Number((new Date().getTime() / 1000 - parseInt(startTime)) * 100 /
                                                (parseInt(endTime) - parseInt(startTime)))?.toFixed(2) + "%" : "0%"
                                        }}></div>
                                    <p className="m-0 CARD-text"
                                    >Until Price Increase to 1 XTA = {definedPresalePrices[parseInt(currentPhaseIndex) + 1]} USD</p>
                                </div>

                                <h5 className="mt-3 bold">AMOUNT RAISED:  {Number(parseFloat(soldAmountOfPhase))?.toFixed(2)} VSG</h5>
                                <p className="mt-2">1 XTA = {parseFloat(presalePriceOfPhase)} USD</p>
                                {/* <p style={{ margin: 0, padding: 0 }} >1 ETH = {parseFloat(ethPrice)?.toFixed(4)} USD</p> */}

                                <div className="gateway">
                                    {/* <div className="method"
                                        style={{
                                            outline: buyMode === buyModes[0] ? "1px white solid" : "none"
                                        }}
                                        onClick={() => {
                                            setInputAmount(0);
                                            setOutputAmount(0);
                                            setBuyMode(buyModes[0]);
                                            switchToChain(goerli.id);
                                        }}
                                    >
                                        <img src={eth} alt="" className="w-100 method-img" style={{ width: "26px", height: "26px" }} />
                                        <p className="m-0 bold">ETH</p>
                                    </div> */}
                                    {/* <div className="method"
                                        style={{
                                            outline: buyMode === buyModes[1] ? "1px white solid" : "none"
                                        }}
                                        onClick={() => {
                                            setInputAmount(0);
                                            setOutputAmount(0);
                                            setBuyMode(buyModes[1])
                                            switchToChain(goerli.id);
                                        }}
                                    >
                                        <img src={VSG} alt="" className="w-100 method-img" style={{ width: "24px", height: "24px" }} />
                                        <p className="m-0 bold">VSG</p>
                                    </div> */}
                                </div>

                                <div className="buy-form text-left"
                                >
                                    <div className="form-group">
                                        <span>Amount in {
                                            buyMode === "byETH" && "ETH"
                                        }
                                            {
                                                buyMode === "byVSG" && "VSG"}
                                            {
                                                buyMode === "byCard" && "Card"
                                            }
                                            {
                                                buyMode === "byBNB" && "BNB"
                                            }
                                            &nbsp;you pay</span>
                                        <div className="input d-flex">
                                            <input type="number" id='other' value={inputAmount} onChange={(e) => onChangeInputAmount(e.target.value)} />
                                            {
                                                buyMode === "byETH" ?
                                                    <img src={eth} alt="" style={{ width: "20px", height: "20px", marginRight: "4px" }} />
                                                    :
                                                    buyMode === "byVSG" ?
                                                        <img src={VSG} alt="" style={{ width: "18px", height: "18px", marginRight: "4px" }} />
                                                        :
                                                            <img src={greenDollar} style={{ width: "26px", height: "26px", marginRight: "4px" }} alt="" />
                                            }
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <span>Amount in XTA you receive</span>
                                        <div className="input d-flex">
                                            <input type="number" value={Number(outputAmount).toFixed(2)} id='sup' disabled />
                                            <img src={XETA} className="method-img" alt="" />
                                        </div>
                                    </div>
                                </div>

                                <button className="btn btn-primary buy-btn btn-block"
                                    onClick={() => onClickBuy()}
                                >{getButtonText()}
                                </button>

                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    fontSize: "14px"
                                }} >
                                    <div className="my-1 mt-2">Current Tier Ends on {formatTimestampToDateString(parseInt(endTime))}</div>
                                    {/* <div className="my-1 mt-2">You paid: {parseFloat(userPaidUSDT ? formatUnits(userPaidUSDT?.toString(), 6) : '0')?.toFixed(2)} USD</div> */}
                                    <div className="my-1 mt-2">You paid: {parseFloat(userPaidVSG ? formatUnits(userPaidVSG?.toString(), 18) : '0')?.toFixed(2)} VSG</div>
                                </div>

                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    fontSize: "14px"
                                }} >
                                    {/* <div className="my-1">XTA DEX Listing {formatTimestampToDateString(process.env.REACT_APP_XTA_DEX_LISTING_DATE)}</div> */}
                                    {/* <div className="my-1 mt-2">Max per wallet: {parseFloat(maxPerWalletOfPhase)} USD</div> */}
                                </div>

                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    fontSize: "14px"
                                }} >
                                    {/* <div className="my-1">Listing Price 1$XTA = {process.env.REACT_APP_SUPCOIN_LISTING_PRICE}USDT</div> */}
                                    {/* <div className="my-1">Min per wallet: {parseFloat(minPerWalletOfPhase)} USD</div> */}
                                </div>
                            </div>
                        </div>
                        {
                            ownerAddress == address ? 
                        <div className="buy-section text-center text-light col-md-6 mx-auto">
                            <div className="form-group" style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-between",
                                fontSize: "14px"
                            }}>
                                <div className="input">
                                    <div className="my-1 mt-2">Current Tier</div>
                                    <input type="number" id='tierNum' value={inputTierNum} className="text" onChange={(e) => onChangeInputTierNum(e.target.value)} />
                                </div>
                                <div className="input">
                                    <div className="my-1 mt-2">Start Date</div>
                                    <input type="date" id='startDate' name="startDate" value={inputStartDate} className="text" min="2024-01-01" onChange={(e) => onChangeInputStartDate(e.target.value)} />
                                </div>
                                <div className="input">
                                    <div className="my-1 mt-2">End Date</div>
                                    <input type="date" id='endDate' name="endDate" value={inputEndDate} className="text" min="2024-01-01" onChange={(e) => onChangeInputEndDate(e.target.value)}  />
                                </div>
                            </div>
                            <button className="btn btn-primary buy-btn btn-block"
                                onClick={() => onClickSetDate()}
                            >Set Start and End Date
                            </button>
                            <br></br>
                            <div className="form-group">
                                <div className="input">
                                    <div className="my-1 mt-2">Amount</div>
                                    <input type="number" id='withdrawAmount' value={inputWithdrawAmount} className="text" onChange={(e) => onChangeInputWithdrawAmount(e.target.value)} />
                                </div>
                            </div>
                            <button className="btn btn-primary buy-btn btn-block"
                                onClick={() => onClickWithdraw()}
                            >Withdraw
                            </button>
                            <br />
                            <div>
                                <div className="form-group">
                                <textarea
                                    type="text"
                                    style={{ height: "300px", width: "435px" }}
                                    name="whitelist"
                                    // value={inputWhiteList}
                                    onChange={(e) => onChangeInputWhiteList(e.target.value)}
                                    className="whitelist"
                                    placeholder="Insert address: separate with breaks line.
                                        Ex:
                                        0x34E7f6A4d0BB1fa7aFe548582c47Df337FC337E6
                                        0xd8Ebc66f0E3D638156D6F5eFAe9f43B1eBc113B1
                                        0x968136BB860D9534aF1563a7c7BdDa02B1A979C2"
                                >
                                    {inputWhiteList}
                                </textarea>
                                </div>
                                <button className="btn btn-primary buy-btn btn-block"
                                    onClick={() => onClickSetWhitelist()}
                                >Set Whitelist
                                </button>
                            </div>
                        </div>
                        : <div> </div>
                        }
                    </div>
                </Hero>
            </div>

            <Backdrop
                sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={working || isSwitchingLoading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </>
    )
}

export default Home