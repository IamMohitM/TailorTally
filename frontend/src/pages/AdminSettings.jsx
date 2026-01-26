import React, { useState } from 'react';
import { fetchAPI } from '../api';

export default function AdminSettings() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [msg, setMsg] = useState({ type: '', text: '' });

    async function handleUpdate(e) {
        e.preventDefault();
        setMsg({ type: '', text: '' });

        if (!currentPassword || !newPassword || !confirmPassword) {
            setMsg({ type: 'error', text: 'All fields are required.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        try {
            await fetchAPI('/admin/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            setMsg({ type: 'success', text: 'Password updated successfully.' });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setMsg({ type: 'error', text: err.message || 'Failed to update password.' });
        }
    }

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h1>Admin Settings</h1>
            
            <div className="card">
                <h3 className="mb-4">Change Admin Password</h3>
                
                {msg.text && (
                    <div className={`p-4 mb-4 rounded ${
                        msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                        {msg.text}
                    </div>
                )}

                <form onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input 
                            type="password" 
                            className="input" 
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>New Password</label>
                        <input 
                            type="password" 
                            className="input" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input 
                            type="password" 
                            className="input" 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <div className="mt-6">
                        <button type="submit" className="btn">Update Password</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
