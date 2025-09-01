// src/firestoreService.js
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

// Add a product
export const addProduct = async (product) => {
  await addDoc(collection(db, "products"), product);
};

// Get all products
export const getProducts = async () => {
  const snapshot = await getDocs(collection(db, "products"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Update product
export const updateProduct = async (id, newData) => {
  const productRef = doc(db, "products", id);
  await updateDoc(productRef, newData);
};

// Delete product
export const deleteProduct = async (id) => {
  await deleteDoc(doc(db, "products", id));
};
