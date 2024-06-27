import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import coingold from '../images/components/coingold.png'
import legals from '../store/legals'
import { UIContext } from '../context/UIcontext'
import slugify from 'slugify'

import './Components.css'
import { FaDiscord, FaFacebook, FaInstagram, FaLinkedin, FaTelegram, FaTwitter, FaYoutube } from 'react-icons/fa'

function Footer() {
    const { handleLegal } = useContext(UIContext);

    return (
        <>
        </>
    )
}

export default Footer