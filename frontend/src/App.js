import { useContext } from "react";
import { useState, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom"

import { UIContext } from "./context/UIcontext";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer"
import Marque from "./components/Marque";
import Home from "./pages/Home/Home";


function App() {
    const { setToggle, hideNav, setHideNav } = useContext(UIContext)
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation()

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;

            // You can adjust this value to control when the background color is added back
            const triggerScrollY = 100;

            if (scrollY > triggerScrollY) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        const pattern = /^\/support\/.*/

        if (pattern.test(location.pathname)) {
            setHideNav(false)
        } else setHideNav(true)

        window.addEventListener('scroll', handleScroll);
        // eslint-disable-next-line
    }, [location]);

    const { hash, pathname } = useLocation();

    useEffect(() => {
        if (hash) {
            const element = document.querySelector(hash);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // Scroll the page to the top whenever the pathname changes (i.e., a new page/route is loaded)
            window.scrollTo(0, 0);
        }
    }, [hash, pathname]);


    return (
        <div className="App">
            {
                hideNav && <NavBar isScrolled={isScrolled} />
            }
            <div onClick={() => setToggle(false)}>
                <Routes>
                    <Route path="/" element={<Home />} />
                </Routes>
            </div>
            {/* <Marque /> */}
        </div>
    );
}

export default App;
