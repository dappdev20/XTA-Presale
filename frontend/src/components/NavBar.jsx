import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaBars, FaCaretRight, FaArrowUp, FaTimes } from "react-icons/fa"
import logo from "../images/home/xeta-03.png"
import { UIContext } from '../context/UIcontext'
import { useTranslation } from "react-i18next";
import { Button } from '../Utilities';
import { useAccount, useConnect, useDisconnect, useEnsName, useNetwork } from 'wagmi'
import { toast } from "react-toastify";
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { IoCloseCircleOutline } from "react-icons/io5";
import { minAddress } from "../common/methods";
import styled from 'styled-components';

import { Web3Button } from "@web3modal/react";

// const StyledWeb3Button = styled.web3button.button`
// background-color: #123456 !important;
// `;

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    bgcolor: '#000a',
    border: '1px solid #fff3',
    borderRadius: "10px",
    boxShadow: 24,
    p: 3,
};

function NavBar({ isScrolled }) {

    const { toggle, setToggle, handleDropDown, navDrop, } = useContext(UIContext)

    const { address, isConnected } = useAccount();
    const { chain } = useNetwork();
    const { data: ensName } = useEnsName({ address });

    const { connect, connectors, error: connectionError, isError: isConnectionError } =
        useConnect()
    const { disconnect } = useDisconnect();

    const [openConnectionModal, setOpenConnectionModal] = useState(false);
    const handleOpenConnectionModal = () => setOpenConnectionModal(!openConnectionModal);

    const closeToggler = (e) => {
        setToggle(false);
        handleDropDown(e);
    }

    const { i18n } = useTranslation();
    const { t } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div id='navbar' className={`${isScrolled && "removeBg"}`}>
            <div className="container-fluid">
                <div className="navbar-container flex-wrap">
                    <div className='logo' onClick={closeToggler}>
                        <Link to="/" className='nav-link px-0 mr-5'><img width={72} src={logo} alt="" /></Link>
                    </div>

                    {/* Action Buttons */}
                    <div className='action-btns d-flex nav-link flex-nowrap ml-md-auto'>
                        <div style={{
                            border: "1px solid #fff",
                            borderRadius: "10px"
                        }}>
                            <Web3Button className="web3button" label='Connect Wallet' balance='hide'
                            />
                        </div>
                    </div>

                    {/* <div className="d-flex align-items-center side-nav justify-content-center ">
                        <Link href="#" className="nav-link">Sign In</Link>
                        <div className={`toggler transition ${toggle && "rotate"}`} onClick={() => { setToggle(pre => !pre) }}>
                            {toggle ? <FaTimes size={20} /> : <FaBars size={25} />}
                        </div>
                    </div> */}
                </div>
            </div>

            <Modal
                open={openConnectionModal}
                onClose={() => handleOpenConnectionModal()}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <div variant="h6"
                        style={{
                            color: "white",
                            fontSize: "20px",
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "space-between"
                        }}
                    >
                        <div >Connect Wallet</div>
                        <div ><IoCloseCircleOutline style={{
                            cursor: "pointer",
                            width: "24px",
                            height: "24px"
                        }}
                            onClick={() => handleOpenConnectionModal()}
                        /></div>
                    </div>
                    <div style={{ marginTop: "20px" }}
                    >
                        <div
                            style={{
                                color: "white",
                                display: "flex",
                                justifyContent: "between"
                            }}>
                            <div
                                style={{
                                    color: "rgb(158,158,158)",
                                    cursor: "pointer"
                                }}
                                onClick={() => handleOpenConnectionModal()} />
                        </div>
                        <div
                            style={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.5rem",
                                borderRadius: "1.5rem",
                                color: "white",
                                alignItems: "center"
                            }}
                        >

                            {isConnected !== true ?
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "1.5rem"
                                    }}
                                >
                                    {connectors?.length > 0 && connectors.filter((obj, index, array) => {
                                        return index === array.findIndex((el) => el.id === obj.id);
                                    }).map((connector) => (
                                        <button
                                            disabled={!connector.ready}
                                            key={connector.id}
                                            onClick={() => connect({ connector })}
                                            style={{
                                                minWidth: "150px",
                                                backgroundColor: "transparent",
                                                color: "white",
                                                textTransform: "capitalize"
                                            }}
                                        >
                                            {connector.id}</button>
                                    ))}
                                </div>
                                :
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "1rem"
                                    }}
                                >
                                    {
                                        (chain && chain.id !== 97) &&
                                        <div
                                            style={{
                                                color: "rgb(239,83,80)",
                                                fontSize: "16px",
                                                fontWeight: 600,
                                                textAlign: "center"
                                            }}
                                        >Please change the network of your wallet into Sepolia Testnet. This platform works on BSC Test network.</div>
                                    }
                                    {
                                        (chain && chain.id === 97) &&
                                        <div className="text-green-400 text-[16px] font-semibold text-center"
                                            style={{
                                                color: "rgb(102,187,106)",
                                                fontSize: "16px",
                                                fontWeight: 600,
                                                textAlign: "center"
                                            }}
                                        >{chain.name} network</div>
                                    }
                                    <div
                                        style={{
                                            color: "white",
                                            fontSize: "16px",
                                            fontWeight: 600
                                        }}
                                    >{isConnected ? ensName ?? address : "Not connected"}</div>
                                    <button
                                        style={{
                                            minWidth: "150px",
                                            backgroundColor: "transparent",
                                            color: "white"
                                        }}
                                        onClick={() => disconnect()}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            }
                        </div>
                    </div>
                </Box>
            </Modal>
        </div>
    )
}

export default NavBar