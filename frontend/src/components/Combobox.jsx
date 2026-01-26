import React, { useState, useEffect, useRef } from 'react';

export default function Combobox({ 
    options = [], 
    value, 
    onChange, 
    onCreate, 
    placeholder = "Select...",
    inputStyle = {},
    id,
    onKeyDown
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const listRef = useRef(null);

    // Sync internal search term with external value changes
    useEffect(() => {
        const selectedOption = options.find(o => o.id == value);
        if (selectedOption) {
            setSearchTerm(selectedOption.name);
        } else if (!value) {
            setSearchTerm("");
        }
    }, [value, options]);

    // Handle clicking outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
                // Revert search term to selected value on blur if no change made
                const selectedOption = options.find(o => o.id == value);
                if (selectedOption) {
                    setSearchTerm(selectedOption.name);
                } else if (!value) {
                    setSearchTerm("");
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, options]);

    const filteredOptions = options.filter(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option) => {
        onChange(option.id);
        setSearchTerm(option.name);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleCreate = () => {
        if (onCreate && searchTerm.trim()) {
            onCreate(searchTerm);
            setIsOpen(false);
            setHighlightedIndex(-1);
        }
    };

    const scrollHighlightedIntoView = (index) => {
        if (listRef.current && index >= 0) {
            const list = listRef.current;
            const element = list.children[index];
            if (element) {
                const listTop = list.scrollTop;
                const listBottom = listTop + list.clientHeight;
                const elementTop = element.offsetTop;
                const elementBottom = elementTop + element.clientHeight;

                if (elementTop < listTop) {
                    list.scrollTop = elementTop;
                } else if (elementBottom > listBottom) {
                    list.scrollTop = elementBottom - list.clientHeight;
                }
            }
        }
    };

    return (
        <div className="combobox-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
            <input 
                id={id}
                type="text"
                className="input"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                    setHighlightedIndex(-1); // Reset highlight on search change
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (!isOpen) {
                            setIsOpen(true);
                            setHighlightedIndex(0);
                        } else {
                            const maxIndex = filteredOptions.length - 1 + (searchTerm && !filteredOptions.some(o => o.name.toLowerCase() === searchTerm.toLowerCase()) ? 1 : 0);
                            const nextIndex = Math.min(highlightedIndex + 1, maxIndex);
                            setHighlightedIndex(nextIndex);
                            scrollHighlightedIntoView(nextIndex);
                        }
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (isOpen) {
                            const prevIndex = Math.max(highlightedIndex - 1, 0);
                            setHighlightedIndex(prevIndex);
                            scrollHighlightedIntoView(prevIndex);
                        }
                    } else if (e.key === 'Enter') {
                        e.preventDefault(); // Prevent form submission
                        
                        // If item is highlighted, select it
                        if (isOpen && highlightedIndex >= 0) {
                             if (highlightedIndex < filteredOptions.length) {
                                 handleSelect(filteredOptions[highlightedIndex]);
                             } else {
                                 // Last item is usually Create option
                                 handleCreate();
                             }
                        } else {
                            // Default behavior if nothing highlighted (exact match fallback)
                            const exactMatch = filteredOptions.find(o => o.name.toLowerCase() === searchTerm.toLowerCase());
                            if (exactMatch) {
                                handleSelect(exactMatch);
                            } else if (onCreate && searchTerm.trim()) {
                                handleCreate();
                            }
                        }
                        
                        if (onKeyDown) {
                            onKeyDown(e);
                        }
                    } else if (e.key === 'Escape') {
                        setIsOpen(false);
                    }
                }}
                style={{ width: '100%', ...inputStyle }}
            />
            
            {isOpen && (searchTerm || filteredOptions.length > 0) && (
                <div 
                    ref={listRef}
                    className="combobox-options" 
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    {filteredOptions.map((option, index) => (
                        <div 
                            key={option.id}
                            className="combobox-option"
                            onClick={() => handleSelect(option)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f0f0f0',
                                background: index === highlightedIndex ? '#f0f7ff' : 'white'
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            {option.name}
                        </div>
                    ))}
                    
                    {searchTerm && !filteredOptions.some(o => o.name.toLowerCase() === searchTerm.toLowerCase()) && (
                        <div 
                            className="combobox-option create-option"
                            onClick={handleCreate}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                color: '#007bff',
                                fontWeight: '500',
                                background: filteredOptions.length === highlightedIndex ? '#f0f7ff' : 'white'
                            }}
                            onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                        >
                            + Create "{searchTerm}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
