"use client";

import { useState } from "react";
import { NavbarLinks } from "./links";

export function MobileLinks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hover:cursor-pointer inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="absolute shadow-lg w-screen left-0 px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-blue-50 dark:bg-gray-900"
        >
          <NavbarLinks />
        </div>
      )}
    </div>
  );
}
