"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";

import classes from "./nav-link.module.css"

/**
 * A custom link component that applies an active class based on the current path.
 */

export default function NavLink({href, children}) {
    const path = usePathname();


    return (
        <Link 
        href={href}
        className={path.startsWith(href) ? `${classes.link} ${classes.active}` : classes.link}
        >
            {children}
        </Link>
    );
}