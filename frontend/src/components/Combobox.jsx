import React, { useState, useEffect, useRef } from 'react';

export default function Combobox({ 
    options = [], 
    value, 
    onChange, 
    onCreate, 
    placeholder = "Select...",
    inputStyle = {} 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef(null);

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
    };

    const handleCreate = () => {
        if (onCreate && searchTerm.trim()) {
            onCreate(searchTerm);
            setIsOpen(false);
        }
    };

    return (
        <div className="combobox-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
            <input 
                type="text"
                className="input"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault(); // Prevent form submission
                        const exactMatch = filteredOptions.find(o => o.name.toLowerCase() === searchTerm.toLowerCase());
                        if (exactMatch) {
                            handleSelect(exactMatch);
                        } else if (onCreate && searchTerm.trim()) {
                            handleCreate();
                        }
                    }
                }}
                style={{ width: '100%', ...inputStyle }}
            />
            
            {isOpen && (searchTerm || filteredOptions.length > 0) && (
                <div className="combobox-options" style={{
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
                    {filteredOptions.map(option => (
                        <div 
                            key={option.id}
                            className="combobox-option"
                            onClick={() => handleSelect(option)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f0f0f0'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
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
                                fontWeight: '500'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f0f7ff'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                            + Create "{searchTerm}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
