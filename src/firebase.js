import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyAk5V6KJJgDz81G2Qi8ovTYuGpPjKO9D1w",
    authDomain: "pharmecy-64585.firebaseapp.com",
    databaseURL: "https://pharmecy-64585-default-rtdb.firebaseio.com",
    projectId: "pharmecy-64585",
    storageBucket: "pharmecy-64585.firebasestorage.app",
    messagingSenderId: "791162416804",
    appId: "1:791162416804:web:6a88454fa71cc54d080031",
    measurementId: "G-568YL63L4L"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
