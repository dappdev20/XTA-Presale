import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  ethPrice: 2050,
  usdtPrice: 1.007,
};


const pricesSlice = createSlice({
  name: "prices",
  initialState,
  reducers: {
    setETHPrice: (state, action) => {
      return { ...state, ethPrice: action.payload }
    },
    setUSDTPrice: (state, action) => {
      return { ...state, usdtPrice: action.payload }
    },
  },
});

const { reducer, actions } = pricesSlice;

export const {
  setETHPrice,
  setUSDTPrice
} = actions;
export default reducer;
