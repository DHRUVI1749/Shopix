import { auth, db, storage } from "./firebase.js";

import {
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";


// ==========================================
// FORM ELEMENTS
// ==========================================

const warrantyForm =
    document.getElementById("warrantyForm");

const productName =
    document.getElementById("productName");

const storeName =
    document.getElementById("storeName");

const purchaseDate =
    document.getElementById("purchaseDate");

const warrantyDuration =
    document.getElementById("warrantyDuration");

const expiryDate =
    document.getElementById("expiryDate");

const warrantyStatus =
    document.getElementById("warrantyStatus");

const cancelWarrantyBtn =
    document.getElementById("cancelWarrantyBtn");


// ==========================================
// RECEIPT PRODUCT ELEMENTS
// ==========================================

const receiptProductSelect =
    document.getElementById("receiptProductSelect");

const selectedReceiptInfo =
    document.getElementById("selectedReceiptInfo");

const selectedStoreName =
    document.getElementById("selectedStoreName");

const selectedPurchaseDate =
    document.getElementById("selectedPurchaseDate");


// ==========================================
// DASHBOARD ELEMENTS
// ==========================================

const activeWarrantyCount =
    document.getElementById("activeWarrantyCount");

const expiringWarrantyCount =
    document.getElementById("expiringWarrantyCount");

const expiredWarrantyCount =
    document.getElementById("expiredWarrantyCount");

const totalWarrantyCount =
    document.getElementById("totalWarrantyCount");

const upcomingWarrantyBody =
    document.getElementById("upcomingWarrantyBody");

const upcomingWarrantyCount =
    document.getElementById("upcomingWarrantyCount");

const warrantyReminderText =
    document.getElementById("warrantyReminderText");

const warrantyHistoryBody =
    document.getElementById("warrantyHistoryBody");


// ==========================================
// PROFILE ELEMENTS
// ==========================================

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const profileAvatar =
    document.getElementById("profileAvatar");

const topProfileName =
    document.getElementById("topProfileName");

const topProfileAvatar =
    document.getElementById("topProfileAvatar");


// ==========================================
// PROFILE MODAL ELEMENTS
// ==========================================

const profileButton =
    document.getElementById("profileButton");

const profileModal =
    document.getElementById("profileModal");

const closeProfileModal =
    document.getElementById("closeProfileModal");

const profileLargeAvatar =
    document.getElementById("profileLargeAvatar");

const changeAvatarBtn =
    document.getElementById("changeAvatarBtn");

const removeAvatarBtn =
    document.getElementById("removeAvatarBtn");

const avatarInput =
    document.getElementById("avatarInput");

const profileNameInput =
    document.getElementById("profileNameInput");

const profileEmailInput =
    document.getElementById("profileEmailInput");

const profileMessage =
    document.getElementById("profileMessage");

const saveProfile =
    document.getElementById("saveProfile");


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;
let receiptProducts = [];
let selectedReceiptId = null;
let allWarranties = [];

let selectedAvatarFile = null;
let avatarRemoved = false;


// ==========================================
// LOAD USER PROFILE
// ==========================================

function loadUserProfile(user) {

    if (!user) {
        return;
    }

    const name =
        user.displayName ||
        user.email?.split("@")[0] ||
        "User";

    const email =
        user.email ||
        "user@email.com";


    // ======================================
    // SIDEBAR PROFILE
    // ======================================

    if (profileName) {
        profileName.textContent = name;
    }

    if (profileEmail) {
        profileEmail.textContent = email;
    }


    // ======================================
    // TOP-RIGHT PROFILE
    // ======================================

    if (topProfileName) {
        topProfileName.textContent = name;
    }


    // ======================================
    // PROFILE AVATAR
    // ======================================

    if (user.photoURL) {

        if (profileAvatar) {
            profileAvatar.innerHTML = `
                <img
                    src="${user.photoURL}"
                    alt="Profile"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:50%;
                    ">
            `;
        }

        if (topProfileAvatar) {
            topProfileAvatar.innerHTML = `
                <img
                    src="${user.photoURL}"
                    alt="Profile"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:50%;
                    ">
            `;
        }

    } else {

        const initial =
            name.charAt(0).toUpperCase();

        if (profileAvatar) {
            profileAvatar.textContent = initial;
        }

        if (topProfileAvatar) {
            topProfileAvatar.textContent = initial;
        }
    }

}


// ==========================================
// OPEN PROFILE MODAL
// ==========================================

function openProfileModal() {

    if (!currentUser) {
        return;
    }

    const name =
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "User";

    const email =
        currentUser.email ||
        "user@email.com";


    // Fill profile information

    if (profileNameInput) {
        profileNameInput.value = name;
    }

    if (profileEmailInput) {
        profileEmailInput.value = email;
    }


    // Reset temporary avatar changes

    selectedAvatarFile = null;
    avatarRemoved = false;


    // Show current avatar

    if (currentUser.photoURL) {

        profileLargeAvatar.innerHTML = `
            <img
                src="${currentUser.photoURL}"
                alt="Profile"
                style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    border-radius:50%;
                ">
        `;

    } else {

        profileLargeAvatar.textContent =
            name.charAt(0).toUpperCase();
    }


    if (profileMessage) {
        profileMessage.textContent = "";
    }


    profileModal.style.display = "flex";
}


// ==========================================
// CLOSE PROFILE MODAL
// ==========================================

function closeProfile() {

    profileModal.style.display = "none";

    selectedAvatarFile = null;
    avatarRemoved = false;
}


// ==========================================
// PROFILE BUTTON CLICK
// ==========================================

if (profileButton) {

    profileButton.addEventListener(
        "click",
        openProfileModal
    );
}


// ==========================================
// SIDEBAR PROFILE CLICK
// ==========================================

if (profileAvatar) {

    profileAvatar.addEventListener(
        "click",
        openProfileModal
    );
}


// ==========================================
// CLOSE BUTTON
// ==========================================

if (closeProfileModal) {

    closeProfileModal.addEventListener(
        "click",
        closeProfile
    );
}


// ==========================================
// CLOSE MODAL WHEN CLICK OUTSIDE
// ==========================================

if (profileModal) {

    profileModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === profileModal
            ) {

                closeProfile();
            }

        }
    );
}


// ==========================================
// CHANGE AVATAR BUTTON
// ==========================================

if (changeAvatarBtn) {

    changeAvatarBtn.addEventListener(
        "click",
        () => {

            avatarInput.click();

        }
    );
}


// ==========================================
// AVATAR IMAGE SELECT
// ==========================================

if (avatarInput) {

    avatarInput.addEventListener(
        "change",
        () => {

            const file =
                avatarInput.files[0];

            if (!file) {
                return;
            }


            // Check image type

            if (!file.type.startsWith("image/")) {

                alert(
                    "Please select an image file."
                );

                return;
            }


            selectedAvatarFile = file;
            avatarRemoved = false;


            // Preview image

            const imageURL =
                URL.createObjectURL(file);


            profileLargeAvatar.innerHTML = `
                <img
                    src="${imageURL}"
                    alt="Profile Preview"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:50%;
                    ">
            `;

        }
    );
}


// ==========================================
// REMOVE AVATAR
// ==========================================

if (removeAvatarBtn) {

    removeAvatarBtn.addEventListener(
        "click",
        () => {

            selectedAvatarFile = null;
            avatarRemoved = true;

            const name =
                profileNameInput?.value ||
                currentUser?.email?.split("@")[0] ||
                "User";


            profileLargeAvatar.textContent =
                name.charAt(0).toUpperCase();

        }
    );
}


// ==========================================
// SAVE PROFILE
// ==========================================

if (saveProfile) {

    saveProfile.addEventListener(
        "click",
        async () => {

            if (!currentUser) {
                return;
            }


            const newName =
                profileNameInput.value.trim();


            if (!newName) {

                profileMessage.textContent =
                    "Please enter your name.";

                return;
            }


            try {

                saveProfile.disabled = true;

                profileMessage.textContent =
                    "Saving...";


                // ==================================
                // CURRENT PHOTO URL
                // ==================================

                let photoURL =
                    currentUser.photoURL || null;


                // ==================================
                // REMOVE OLD AVATAR
                // ==================================

                if (avatarRemoved) {

                    try {

                        const oldAvatarRef =
                            storageRef(
                                storage,
                                `avatars/${currentUser.uid}/profile.jpg`
                            );


                        await deleteObject(
                            oldAvatarRef
                        );

                    } catch (error) {

                        // Ignore if old file does not exist

                        console.log(
                            "Old avatar not found or already removed."
                        );
                    }


                    photoURL = null;
                }


                // ==================================
                // UPLOAD NEW AVATAR
                // ==================================

                if (selectedAvatarFile) {

                    const avatarRef =
                        storageRef(
                            storage,
                            `avatars/${currentUser.uid}/profile.jpg`
                        );


                    await uploadBytes(
                        avatarRef,
                        selectedAvatarFile
                    );


                    photoURL =
                        await getDownloadURL(
                            avatarRef
                        );
                }


                // ==================================
                // UPDATE FIREBASE AUTH PROFILE
                // ==================================

                await updateProfile(
                    currentUser,
                    {
                        displayName:
                            newName,

                        photoURL:
                            photoURL
                    }
                );


                // ==================================
                // UPDATE UI
                // ==================================

                loadUserProfile(
                    currentUser
                );


                profileMessage.textContent =
                    "Profile updated successfully!";


                selectedAvatarFile = null;
                avatarRemoved = false;


                setTimeout(
                    () => {

                        closeProfile();

                    },
                    800
                );


            } catch (error) {

                console.error(
                    "Profile update error:",
                    error
                );


                profileMessage.textContent =
                    "Unable to update profile. Please try again.";

            } finally {

                saveProfile.disabled = false;

            }

        }
    );
}


// ==========================================
// CALCULATE WARRANTY EXPIRY
// ==========================================

function calculateExpiryDate() {

    if (
        !purchaseDate.value ||
        !warrantyDuration.value
    ) {

        expiryDate.value = "";
        warrantyStatus.value = "";

        return;
    }


    const purchase =
        new Date(purchaseDate.value);

    const months =
        parseInt(warrantyDuration.value);


    if (
        isNaN(months) ||
        months <= 0
    ) {

        expiryDate.value = "";
        warrantyStatus.value = "";

        return;
    }


    purchase.setMonth(
        purchase.getMonth() + months
    );


    const year =
        purchase.getFullYear();

    const month =
        String(
            purchase.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            purchase.getDate()
        ).padStart(2, "0");


    expiryDate.value =
        `${year}-${month}-${day}`;


    updateWarrantyStatus();

}


// ==========================================
// CALCULATE STATUS
// ==========================================

function getWarrantyStatus(expiry) {

    if (!expiry) {
        return "Unknown";
    }


    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    const expiryDateObj =
        new Date(expiry);

    expiryDateObj.setHours(
        0,
        0,
        0,
        0
    );


    const difference =
        expiryDateObj.getTime() -
        today.getTime();


    const daysRemaining =
        Math.ceil(
            difference /
            (1000 * 60 * 60 * 24)
        );


    if (daysRemaining < 0) {
        return "Expired";
    }


    if (daysRemaining <= 30) {
        return "Expiring Soon";
    }


    return "Active";

}


// ==========================================
// UPDATE FORM STATUS
// ==========================================

function updateWarrantyStatus() {

    if (!expiryDate.value) {

        warrantyStatus.value = "";

        return;
    }


    warrantyStatus.value =
        getWarrantyStatus(
            expiryDate.value
        );

}


// ==========================================
// LOAD RECEIPT PRODUCTS
// ==========================================

async function loadReceiptProducts() {

    if (!currentUser) {
        return;
    }


    receiptProducts = [];


    receiptProductSelect.innerHTML =
        '<option value="">Select a product</option>';


    try {

        const receiptsRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "receipts"
            );


        const snapshot =
            await getDocs(
                receiptsRef
            );


        snapshot.forEach((doc) => {

            const receipt =
                doc.data();


            const items =
                Array.isArray(
                    receipt.items
                )
                    ? receipt.items
                    : [];


            items.forEach((item) => {

                let productNameValue = "";


                if (
                    typeof item === "string"
                ) {

                    productNameValue =
                        item;

                } else if (
                    item &&
                    item.name
                ) {

                    productNameValue =
                        item.name;
                }


                if (!productNameValue) {
                    return;
                }


                const product = {

                    receiptId:
                        doc.id,

                    productName:
                        productNameValue,

                    storeName:
                        receipt.storeName ||
                        "Unknown Store",

                    purchaseDate:
                        receipt.purchaseDate ||
                        ""

                };


                receiptProducts.push(
                    product
                );

            });

        });


        if (
            receiptProducts.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value = "";

            option.textContent =
                "No receipt products found";


            receiptProductSelect.appendChild(
                option
            );


            return;
        }


        receiptProducts.forEach(
            (product, index) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    index;


                option.textContent =
                    `${product.productName} — ${product.storeName}`;


                receiptProductSelect.appendChild(
                    option
                );

            }
        );


    } catch (error) {

        console.error(
            "Error loading receipt products:",
            error
        );

    }

}


// ==========================================
// SELECT RECEIPT PRODUCT
// ==========================================

receiptProductSelect.addEventListener(
    "change",
    () => {

        const selectedIndex =
            receiptProductSelect.value;


        if (selectedIndex === "") {

            selectedReceiptId =
                null;


            selectedReceiptInfo.style.display =
                "none";


            return;
        }


        const product =
            receiptProducts[
                selectedIndex
            ];


        if (!product) {
            return;
        }


        selectedReceiptId =
            product.receiptId;


        productName.value =
            product.productName;


        storeName.value =
            product.storeName;


        purchaseDate.value =
            product.purchaseDate;


        selectedStoreName.textContent =
            product.storeName;


        selectedPurchaseDate.textContent =
            product.purchaseDate ||
            "-";


        selectedReceiptInfo.style.display =
            "block";


        calculateExpiryDate();

    }
);


// ==========================================
// FORM INPUT EVENTS
// ==========================================

purchaseDate.addEventListener(
    "change",
    calculateExpiryDate
);


warrantyDuration.addEventListener(
    "change",
    calculateExpiryDate
);


// ==========================================
// CANCEL BUTTON
// ==========================================

cancelWarrantyBtn.addEventListener(
    "click",
    () => {

        warrantyForm.reset();


        expiryDate.value =
            "";


        warrantyStatus.value =
            "";


        selectedReceiptId =
            null;


        selectedReceiptInfo.style.display =
            "none";


        receiptProductSelect.value =
            "";

    }
);


// ==========================================
// SAVE WARRANTY
// ==========================================

warrantyForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUser) {

            alert(
                "Please log in before saving a warranty."
            );


            return;
        }


        if (!expiryDate.value) {

            alert(
                "Please enter the purchase date and warranty duration."
            );


            return;
        }


        try {

            await addDoc(

                collection(
                    db,
                    "users",
                    currentUser.uid,
                    "warranties"
                ),

                {

                    productName:
                        productName.value.trim(),

                    storeName:
                        storeName.value.trim(),

                    purchaseDate:
                        purchaseDate.value,

                    warrantyDurationMonths:
                        parseInt(
                            warrantyDuration.value
                        ),

                    warrantyExpiryDate:
                        expiryDate.value,

                    status:
                        warrantyStatus.value,

                    receiptId:
                        selectedReceiptId ||
                        null,

                    createdAt:
                        serverTimestamp()

                }

            );


            alert(
                "Warranty saved successfully!"
            );


            warrantyForm.reset();


            expiryDate.value =
                "";


            warrantyStatus.value =
                "";


            selectedReceiptId =
                null;


            selectedReceiptInfo.style.display =
                "none";


            receiptProductSelect.value =
                "";


            await loadWarranties();


        } catch (error) {

            console.error(
                "Error saving warranty:",
                error
            );


            alert(
                "Unable to save warranty. Check the console for details."
            );

        }

    }
);


// ==========================================
// LOAD WARRANTIES FROM FIRESTORE
// ==========================================

async function loadWarranties() {

    if (!currentUser) {
        return;
    }


    try {

        const warrantiesRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "warranties"
            );


        const snapshot =
            await getDocs(
                warrantiesRef
            );


        allWarranties = [];


        snapshot.forEach((doc) => {

            const warranty =
                doc.data();


            allWarranties.push({

                id:
                    doc.id,

                ...warranty

            });

        });


        updateDashboard();


    } catch (error) {

        console.error(
            "Error loading warranties:",
            error
        );

    }

}


// ==========================================
// UPDATE DASHBOARD
// ==========================================

function updateDashboard() {

    const active = [];
    const expiring = [];
    const expired = [];


    allWarranties.forEach(
        (warranty) => {

            const status =
                getWarrantyStatus(
                    warranty.warrantyExpiryDate
                );


            if (
                status === "Active"
            ) {

                active.push(
                    warranty
                );

            } else if (
                status === "Expiring Soon"
            ) {

                expiring.push(
                    warranty
                );

            } else if (
                status === "Expired"
            ) {

                expired.push(
                    warranty
                );

            }

        }
    );


    // ======================================
    // STATISTICS
    // ======================================

    activeWarrantyCount.textContent =
        active.length;


    expiringWarrantyCount.textContent =
        expiring.length;


    expiredWarrantyCount.textContent =
        expired.length;


    totalWarrantyCount.textContent =
        allWarranties.length;


    // ======================================
    // UPCOMING WARRANTIES
    // ======================================

    renderUpcomingWarranties(
        expiring
    );


    // ======================================
    // REMINDER
    // ======================================

    if (
        expiring.length === 0
    ) {

        warrantyReminderText.textContent =
            "No warranties are currently expiring soon.";

    } else {

        warrantyReminderText.textContent =
            `${expiring.length} product${expiring.length > 1 ? "s are" : " is"} expiring soon.`;

    }


    // ======================================
    // HISTORY
    // ======================================

    renderWarrantyHistory(
        expired
    );

}


// ==========================================
// RENDER UPCOMING WARRANTIES
// ==========================================

function renderUpcomingWarranties(
    warranties
) {

    upcomingWarrantyBody.innerHTML =
        "";


    upcomingWarrantyCount.textContent =
        `${warranties.length} product${warranties.length !== 1 ? "s" : ""}`;


    if (
        warranties.length === 0
    ) {

        upcomingWarrantyBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No warranties are expiring within 30 days.
                </td>
            </tr>
        `;


        return;
    }


    warranties.forEach(
        (warranty) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${warranty.productName || "-"}
                </td>

                <td>
                    ${warranty.storeName || "-"}
                </td>

                <td>
                    ${warranty.warrantyExpiryDate || "-"}
                </td>

                <td>
                    <span class="status-badge expiring">
                        Expiring Soon
                    </span>
                </td>

            `;


            upcomingWarrantyBody.appendChild(
                row
            );

        }
    );

}


// ==========================================
// RENDER WARRANTY HISTORY
// ==========================================

function renderWarrantyHistory(
    warranties
) {

    warrantyHistoryBody.innerHTML =
        "";


    if (
        warranties.length === 0
    ) {

        warrantyHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No expired warranties found.
                </td>
            </tr>
        `;


        return;
    }


    warranties.forEach(
        (warranty) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${warranty.productName || "-"}
                </td>

                <td>
                    ${warranty.storeName || "-"}
                </td>

                <td>
                    ${warranty.purchaseDate || "-"}
                </td>

                <td>
                    ${warranty.warrantyExpiryDate || "-"}
                </td>

            `;


            warrantyHistoryBody.appendChild(
                row
            );

        }
    );

}


// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            currentUser =
                null;


            window.location.replace(
                "loginpg.html"
            );


            return;
        }


        currentUser =
            user;


        console.log(
            "Logged-in User UID:",
            user.uid
        );


        // ==================================
        // LOAD USER PROFILE
        // ==================================

        loadUserProfile(
            user
        );


        // ==================================
        // LOAD RECEIPTS
        // ==================================

        await loadReceiptProducts();


        // ==================================
        // LOAD WARRANTIES
        // ==================================

        await loadWarranties();

    }
);