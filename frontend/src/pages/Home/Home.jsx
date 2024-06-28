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
import { mainnet, goerli, bsc, bscTestnet } from 'wagmi/chains';
import { readContract } from '@wagmi/core'
import { Backdrop, CircularProgress } from "@mui/material";
import Web3 from "web3";

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

import { Button, Hero, Section } from '../../Utilities'
import { formatTimestampToDateString } from '../../common/methods'
import TokenABI from "../../chain_interaction/SupCoin.json";
import PresalePlatformABI from "../../chain_interaction/PresalePlatform.json";
import { confirmTransactionReceipt, confirmTransactionReceiptBSC } from '../../chain_interaction/client';
import { socket } from "../../App";

// Import Swiper styles
import "./Home.css"


const buyModes = ["byETH", "byVSG"];
const definedPresalePrices = [0.00006, 0.000075, 0.00009];

function Home() {
    const { isLoading: isSwitchingLoading, switchNetwork } = useSwitchNetwork()
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { chain } = useNetwork();
    
    const ethPrice = useSelector(state => state.price.ethPrice || 0);
    const usdtPrice = useSelector(state => state.price.usdtPrice || 0);

    const [maxAmountOfPhase, setMaxAmountOfPhase] = useState(0);
    const [soldAmountOfPhase, setSoldAmountOfPhase] = useState(0);
    const [startTime, setStartTime] = useState(process.env.REACT_APP_SUPCOIN_PRESALE_START_DATE);
    const [endTime, setEndTime] = useState(process.env.REACT_APP_SUPCOIN_PRESALE_END_DATE);
    const [minPerWalletOfPhase, setMinPerWalletOfPhase] = useState(0);
    const [maxPerWalletOfPhase, setMaxPerWalletOfPhase] = useState(0);

    const [buyMode, setBuyMode] = useState(buyModes[1]);
    const [countdown, setCountDown] = useState(0);
    const [inputAmount, setInputAmount] = useState(0);
    const [outputAmount, setOutputAmount] = useState(0);
    const [debouncedInputAmount] = useDebounce(inputAmount, 100);
    const [working, setWorking] = useState(false);
    const [targetDate, setTargetDate] = useState(new Date(process.env.REACT_APP_SUPCOIN_PRESALE_END_DATE * 1000));
    const [approvingTxHash, setApprovingTxHash] = useState("");
    const [presaleTxHash, setPresaleTxHash] = useState("");
    const [presalePriceOfPhase, setPresalePriceOfPhase] = useState(0);
    const chainId = 97;

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
        const supAmount = buyMode === "byETH" ?
            debouncedInputAmount * ethPrice / parseFloat(presalePriceOfPhase || (definedPresalePrices[0] / 100)) :
            buyMode === "byVSG" ?
                debouncedInputAmount * usdtPrice / parseFloat(presalePriceOfPhase || (definedPresalePrices[0] / 100))
                :
                    Math.floor(debouncedInputAmount / parseFloat(presalePriceOfPhase || (definedPresalePrices[0] / 100)));
        setOutputAmount(supAmount);
        console.log('Debounce = ', debouncedInputAmount, definedPresalePrices[0] / 100);
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

    useEffect(() => {
        if (!activePhaseStatus) return;

        setMaxAmountOfPhase(formatEther(activePhaseStatus[0]?.toString()));
        setPresalePriceOfPhase(formatUnits(activePhaseStatus[1]?.toString(), 6));
        setStartTime(activePhaseStatus[2]);
        setEndTime(activePhaseStatus[3]);
        setSoldAmountOfPhase(formatEther(activePhaseStatus[4]?.toString()));
        setStartTime(activePhaseStatus[4]);
        setTargetDate(new Date(parseInt(activePhaseStatus[5]) * 1000));
        setEndTime(activePhaseStatus[5]);
        console.log("startTIme >>> ", activePhaseStatus[4], " endTIme >>> ", activePhaseStatus[5]);
        setPresalePriceOfPhase(formatUnits(activePhaseStatus[1]?.toString(), 6));
        setMaxPerWalletOfPhase(formatUnits(activePhaseStatus[3]?.toString(), 6));
        setMinPerWalletOfPhase(formatUnits(activePhaseStatus[2]?.toString(), 6));

        console.log("activePhase >>> ", formatEther(activePhaseStatus[0]?.toString()),
            formatEther(activePhaseStatus[6]?.toString()),
            activePhaseStatus[4],
            activePhaseStatus[5],
            formatUnits(activePhaseStatus[1]?.toString(), 6),
            Number(parseFloat(formatEther(activePhaseStatus[6]?.toString())) * 100 / parseFloat(formatEther(activePhaseStatus[0]?.toString())))?.toFixed(2) + "%"
        );
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
                    toast.warning("This platform works on BSC Testnet network for VSG payment. Please change the network of your wallet into BSC Testnte and try again. ");
                    return;
                }

                console.log("debouncedInputAmount  >>> ", debouncedInputAmount);
                if (parseFloat(debouncedInputAmount) > parseFloat(maxPerWalletOfPhase)) {
                    toast.warn(`In this phrase of presale, maximum is ${parseInt(maxPerWalletOfPhase)} USDT. Please input valid amount and try again.`)
                    return;
                }
                if (parseFloat(debouncedInputAmount) < parseFloat(minPerWalletOfPhase)) {
                    toast.warn(`In this phrase of presale, minimum is ${parseInt(minPerWalletOfPhase)} USDT. Please input valid amount and try again.`)
                    return;
                }
                setWorking(true);

                const allowance = await readContract({
                    address: process.env.REACT_APP_USDT_ADDRESS,
                    abi: TokenABI,
                    functionName: 'allowance',
                    args: [address, process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS],
                })
                console.log(allowance, parseFloat(formatUnits(allowance !== undefined && allowance?.toString(), 6)), parseFloat(outputAmount));
                if (parseFloat(formatUnits(allowance !== undefined && allowance?.toString(), 6)) < parseFloat(outputAmount)) {
                    const aproveHash = await walletClient.writeContract({
                        address: process.env.REACT_APP_USDT_ADDRESS,
                        abi: TokenABI,
                        functionName: "approve",
                        args: [process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS, parseUnits(debouncedInputAmount !== undefined && debouncedInputAmount?.toString(), 6)], wallet: address,

                    });
                    setApprovingTxHash(aproveHash);
                }

                const presaleHash = await walletClient.writeContract({
                    address: process.env.REACT_APP_PRESALE_PLATFORM_ADDRESS,
                    abi: PresalePlatformABI,
                    functionName: 'buyTokensWithUSDT',
                    args: [parseUnits(debouncedInputAmount !== undefined && debouncedInputAmount?.toString(), 6)],

                });
                setPresaleTxHash(presaleHash);
            }
        } catch (err) {
            console.error(err);
            setWorking(false);
        }
    }

    useEffect(() => {
        (async () => {
            if (approvingTxHash) {
                setTimeout(async () => {
                    try {
                        const receipt = await confirmTransactionReceipt(approvingTxHash);
                        console.log(receipt);
                        setApprovingTxHash(null);
                        toast.success("You've approved your USDT to presale contract!");
                    } catch (err) {
                        setWorking(false);
                        setApprovingTxHash(null);
                        console.log(err);
                    }
                }, 3000);
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
                        toast.success("You've successfully bought SUP coins.");
                    } catch (err) {
                        setWorking(false);
                        setPresaleTxHash(null);
                        console.log(err);
                    }
                }, 3000);
            }
        })()
    }, [approvingTxHash, presaleTxHash])

    const onChangeInputAmount = (value) => {
        console.log(parseFloat(value));
        setInputAmount(parseFloat(value));
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
                        <div className="col-md-4 mx-auto">
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
                                    >Until Price Increase to 1 SUP = {definedPresalePrices[parseInt(currentPhaseIndex) + 1]} USD</p>
                                </div>

                                <h5 className="mt-3 bold">AMOUNT RAISED:  ${Number(parseFloat(soldAmountOfPhase) * parseFloat(presalePriceOfPhase))?.toFixed(2)}</h5>
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
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between"
                                    }}
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
                                            <img src={iconBlue} className="method-img" alt="" />
                                        </div>
                                    </div>
                                </div>

                                <button className="btn btn-primary buy-btn btn-block"
                                    onClick={() => onClickBuy()}
                                >Buy with&nbsp;
                                    {
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
                                </button>

                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    fontSize: "14px"
                                }} >
                                    <div className="my-1 mt-2">Presale Ends {formatTimestampToDateString(process.env.REACT_APP_SUPCOIN_PRESALE_END_DATE)}</div>
                                    <div className="my-1 mt-2">You paid: {parseFloat(userPaidUSDT ? formatUnits(userPaidUSDT?.toString(), 6) : '0')?.toFixed(2)} USD</div>
                                </div>

                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    fontSize: "14px"
                                }} >
                                    <div className="my-1">SUP DEX Listing {formatTimestampToDateString(process.env.REACT_APP_SUPCOIN_DEX_LISTING_DATE)}</div>
                                    <div className="my-1 mt-2">Max per wallet: {parseFloat(maxPerWalletOfPhase)} USD</div>
                                </div>

                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    fontSize: "14px"
                                }} >
                                    <div className="my-1">Listing Price 1$SUP = {process.env.REACT_APP_SUPCOIN_LISTING_PRICE}USDT</div>
                                    <div className="my-1">Min per wallet: {parseFloat(minPerWalletOfPhase)} USD</div>
                                </div>

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
                        </div>
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