import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, themeConfig } from '../../theme/theme';
import { useAuth } from '../../../lib/auth/Global_Provider';
import { useToast } from '../../toast/Toast';
import { signOutUser, updateUserAvatar, updateUserName } from '../../../lib/User';

const Profile = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const { user, updateAuthState, userDetails, updateUserDetails } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const initialsRef = useRef(null);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    joinDate: '',
    avatar: '',
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  
  // Get avatar URL directly from userDetails
  const avatarUrl = userDetails?.avatarUrl || null;
  
  // Set up user profile data from userDetails
  useEffect(() => {
    if (userDetails) {
      const joinDate = userDetails.created_at 
        ? new Date(userDetails.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
        : 'Recently';
      const name = userDetails.name || userDetails.email?.split('@')[0] || 'User';
      const initials = name 
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : userDetails.email ? userDetails.email[0].toUpperCase() : 'U';

      setUserProfile({
        name: name,
        email: userDetails.email || '',
        joinDate: joinDate,
        avatar: initials,
      });
      setEditedName(name);
    } else if (user) {
      // Fallback to user metadata if userDetails not available yet
      const userMetadata = user.user_metadata || {};
      const joinDate = user.created_at 
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
        : 'Recently';
      const name = userMetadata.full_name || user.email?.split('@')[0] || 'User';
      const initials = name 
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user.email ? user.email[0].toUpperCase() : 'U';

      setUserProfile({
        name: name,
        email: user.email || '',
        joinDate: joinDate,
        avatar: initials,
      });
      setEditedName(name);
    }
  }, [user, userDetails]);


  const handleSignOut = async () => {
    const { error } = await signOutUser();
    if (error) {
      toast.error('Failed to sign out. Please try again.');
    } else {
      await updateAuthState();
      toast.success('You have been signed out successfully.');
      navigate('/');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const { avatarUrl, error } = await updateUserAvatar(file);

    if (error) {
      toast.error(error.message || 'Failed to update avatar. Please try again.');
      setIsUploadingAvatar(false);
      return;
    }

    if (avatarUrl) {
      // Update user details in Global_Provider (includes avatar)
      await updateUserDetails();
      setShowInitials(false);
      toast.success('Avatar updated successfully!');
    }

    setIsUploadingAvatar(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditName = () => {
    setIsEditingName(true);
    setEditedName(userProfile.name);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName(userProfile.name);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    if (editedName.trim() === userProfile.name) {
      setIsEditingName(false);
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    setIsUpdatingName(true);
    const { success, error } = await updateUserName(user.id, editedName.trim());

    if (error) {
      toast.error(error.message || 'Failed to update name. Please try again.');
      setIsUpdatingName(false);
      return;
    }

    if (success) {
      // Update user details in Global_Provider
      await updateUserDetails();
      setIsEditingName(false);
      toast.success('Name updated successfully!');
    }

    setIsUpdatingName(false);
  };

  return (
    <div className={`min-h-screen ${colors.background} ${colors.text}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${colors.text} mb-2`}>Profile Settings</h1>
          <p className={`text-lg ${colors.textMuted}`}>Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Overview */}
          <div className="lg:col-span-1">
            <div className={`${colors.surface} border ${colors.border} rounded-2xl shadow-lg p-6 sticky top-6`}>
              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div 
                    onClick={handleAvatarClick}
                    className={`w-32 h-32 rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-all duration-300 hover:scale-105 relative ${colors.accentBg} overflow-hidden shadow-lg`}
                  >
                    {/* Avatar Image or Initials */}
                    {avatarUrl ? (
                      <img 
                        key={avatarUrl}
                        src={avatarUrl} 
                        alt="Avatar" 
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                          console.error('Avatar image failed to load:', avatarUrl);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span 
                        ref={initialsRef}
                        className="text-white text-4xl font-bold absolute inset-0 flex items-center justify-center z-0"
                      >
                        {userProfile.avatar}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    className={`text-sm font-medium ${colors.textMuted} hover:${colors.text} transition-colors disabled:opacity-50 flex items-center space-x-1`}
                  >
                    {isUploadingAvatar ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Change Photo</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* User Name */}
                {isEditingName ? (
                  <div className="w-full space-y-3">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className={`w-full px-4 py-2 border-2 ${colors.border} rounded-xl ${colors.surface} ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`}
                      disabled={isUpdatingName}
                      autoFocus
                      placeholder="Enter your name"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSaveName}
                        disabled={isUpdatingName}
                        className={`flex-1 px-4 py-2 text-sm font-medium ${colors.accentBg} text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUpdatingName ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEditName}
                        disabled={isUpdatingName}
                        className={`px-4 py-2 text-sm font-medium border-2 ${colors.border} ${colors.surface} ${colors.text} rounded-xl hover:${colors.surfaceSecondary} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center w-full">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <h2 className={`text-2xl font-bold ${colors.text}`}>{userProfile.name}</h2>
                      <button
                        onClick={handleEditName}
                        className={`p-1.5 ${colors.textMuted} hover:${colors.text} rounded-lg transition-all`}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Edit name"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    <p className={`${colors.textMuted} mb-1`}>{userProfile.email}</p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full ${colors.accent} text-xs font-medium mt-2`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Member since {userProfile.joinDate}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className={`border-t ${colors.border} pt-6 mt-6`}>
                <button
                  onClick={handleSignOut}
                  className={`w-full px-4 py-3 border-2 ${colors.border} ${colors.surface} ${colors.text} rounded-xl hover:${colors.surfaceSecondary} transition-all duration-200 font-medium flex items-center justify-center space-x-2`}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Account Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information Card */}
            <div className={`${colors.surface} border ${colors.border} rounded-2xl shadow-lg overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${colors.border}`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <h3 className={`text-xl font-bold ${colors.text} flex items-center space-x-2`}>
                  <svg className={`w-6 h-6 ${colors.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Account Information</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {/* Username Field */}
                  <div className={`flex items-center justify-between py-4 border-b ${colors.border}`}>
                    <div className="flex-1">
                      <label className={`block text-sm font-medium ${colors.textMuted} mb-1`}>Username</label>
                      <p className={`${colors.text} text-lg font-semibold`}>{userProfile.name}</p>
                    </div>
                    <button
                      onClick={handleEditName}
                      className={`ml-4 p-2 ${colors.textMuted} hover:${colors.text} rounded-lg transition-all`}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Edit username"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>

                  {/* Email Field */}
                  <div className={`flex items-center justify-between py-4 border-b ${colors.border}`}>
                    <div className="flex-1">
                      <label className={`block text-sm font-medium ${colors.textMuted} mb-1`}>Email Address</label>
                      <p className={`${colors.text} text-lg`}>{userProfile.email}</p>
                    </div>
                    <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${colors.successBg} ${colors.success}`}>
                      Verified
                    </div>
                  </div>

                  {/* Account Type Field */}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <label className={`block text-sm font-medium ${colors.textMuted} mb-1`}>Account Type</label>
                      <div className="flex items-center space-x-2">
                        <p className={`${colors.text} text-lg font-semibold`}>Standard User</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.accent}`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Statistics Card */}
            {userDetails && (
              <div className={`${colors.surface} border ${colors.border} rounded-2xl shadow-lg overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${colors.border}`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                  <h3 className={`text-xl font-bold ${colors.text} flex items-center space-x-2`}>
                    <svg className={`w-6 h-6 ${colors.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Account Statistics</span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border ${colors.border}`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <div className={`text-sm font-medium ${colors.textMuted} mb-1`}>Member Since</div>
                      <div className={`text-2xl font-bold ${colors.text}`}>{userProfile.joinDate}</div>
                    </div>
                    <div className={`p-4 rounded-xl border ${colors.border}`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <div className={`text-sm font-medium ${colors.textMuted} mb-1`}>User Type</div>
                      <div className={`text-2xl font-bold ${colors.text}`}>{userDetails.user_type || 'Individual'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
