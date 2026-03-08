import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor, cleanup } from "@testing-library/react";
import SmartSplitCalculator from "@/components/kemana-ui/SmartSplitCalculator";

describe("SmartSplitCalculator Component", () => {
    afterEach(cleanup);
    it("renders default empty item and subtotal input", () => {
        const mockOnCalculated = vi.fn();
        render(
            <SmartSplitCalculator 
                totalAmount={100000} 
                splitPeople={["Kamu", "Teman"]} 
                onSharesCalculated={mockOnCalculated} 
            />
        );

        // Subtotal field should be empty "0"
        expect(screen.getAllByPlaceholderText("0").length).toBeGreaterThan(0);
        // At least one item input should be present (index 1)
        expect(screen.queryByPlaceholderText("Masukan nama item 1 (Opsional)")).not.toBeNull();
        
        // Initial state is invalid (no subtotal entered yet)
        expect(mockOnCalculated).toHaveBeenLastCalledWith([], false);
        expect(screen.queryByText("Masukkan subtotal instruksi")).not.toBeNull();
    });

    it("calculates exact match without taxes properly", async () => {
        const mockOnCalculated = vi.fn();
        render(
            <SmartSplitCalculator 
                totalAmount={100000} 
                splitPeople={["Kamu", "Teman"]} 
                onSharesCalculated={mockOnCalculated} 
            />
        );

        const numInputs = screen.getAllByRole("textbox").filter(i => i.getAttribute("inputmode") === "numeric");
        
        act(() => {
            fireEvent.change(numInputs[0], { target: { value: "100000" } });
            fireEvent.change(numInputs[1], { target: { value: "50000" } });
        });

        const addButton = screen.getAllByRole("button", { name: /Tambah Makanan/i })[0];
        act(() => {
            fireEvent.click(addButton);
        });

        const newInputs = screen.getAllByRole("textbox").filter(i => i.getAttribute("inputmode") === "numeric");
        act(() => {
            fireEvent.change(newInputs[2], { target: { value: "50000" } });
        });

        const selects = screen.getAllByRole("combobox");
        act(() => {
            fireEvent.change(selects[1], { target: { value: "Teman" } });
            fireEvent.change(selects[0], { target: { value: "Kamu" } });
        });

        await waitFor(() => {
            expect(screen.queryByText("Semua item cocok!")).not.toBeNull();
            expect(mockOnCalculated).toHaveBeenLastCalledWith(
                [
                    { person: "Kamu", amount: 50000 },
                    { person: "Teman", amount: 50000 }
                ], 
                true
            );
        });
    });

    it("distributes taxes proportionally", async () => {
        const mockOnCalculated = vi.fn();
        render(
            <SmartSplitCalculator 
                totalAmount={110000} // Includes 10k tax
                splitPeople={["A", "B"]} 
                onSharesCalculated={mockOnCalculated} 
            />
        );

        const numInputs = screen.getAllByRole("textbox").filter(i => i.getAttribute("inputmode") === "numeric");
        act(() => {
            fireEvent.change(numInputs[0], { target: { value: "100000" } });
            fireEvent.change(numInputs[1], { target: { value: "30000" } });
        });
        
        const addButton = screen.getAllByRole("button", { name: /Tambah Makanan/i })[0];
        act(() => { fireEvent.click(addButton); });

        const newInputs = screen.getAllByRole("textbox").filter(i => i.getAttribute("inputmode") === "numeric");
        act(() => { fireEvent.change(newInputs[2], { target: { value: "70000" } }); });

        const selects = screen.getAllByRole("combobox");
        act(() => {
            fireEvent.change(selects[0], { target: { value: "A" } });
            fireEvent.change(selects[1], { target: { value: "B" } });
        });

        await waitFor(() => {
            expect(screen.queryByText("Semua item cocok!")).not.toBeNull();
            expect(mockOnCalculated).toHaveBeenLastCalledWith(
                [
                    { person: "A", amount: 33000 },
                    { person: "B", amount: 77000 }
                ], 
                true
            );
        });
    });

    it("handles rounding errors on tax distribution so sum equals exact total", async () => {
        const mockOnCalculated = vi.fn();
        render(
            <SmartSplitCalculator 
                totalAmount={100} // Total Bill: Rp 100
                splitPeople={["A", "B", "C"]} 
                onSharesCalculated={mockOnCalculated} 
            />
        );

        const numInputs = screen.getAllByRole("textbox").filter(i => i.getAttribute("inputmode") === "numeric");
        act(() => {
            // Because React groups updates, we trigger change event directly
            fireEvent.change(numInputs[0], { target: { value: "90" } }); // Subtotal 90
            fireEvent.change(numInputs[1], { target: { value: "30" } });
        });
        
        const addButton = screen.getAllByRole("button", { name: /Tambah Makanan/i })[0];
        act(() => { fireEvent.click(addButton); });
        
        let newInputs = screen.getAllByRole("textbox").filter(i => i.getAttribute("inputmode") === "numeric");
        act(() => { fireEvent.change(newInputs[2], { target: { value: "30" } }); });

        act(() => { fireEvent.click(addButton); });
        
        newInputs = screen.getAllByRole("textbox").filter(i => i.getAttribute("inputmode") === "numeric");
        act(() => { fireEvent.change(newInputs[3], { target: { value: "30" } }); });

        const selects = screen.getAllByRole("combobox");
        act(() => {
            fireEvent.change(selects[0], { target: { value: "A" } });
            fireEvent.change(selects[1], { target: { value: "B" } });
            fireEvent.change(selects[2], { target: { value: "C" } });
        });

        await waitFor(() => {
            expect(mockOnCalculated).toHaveBeenLastCalledWith(
                [
                    { person: "A", amount: 33 },
                    { person: "B", amount: 33 },
                    { person: "C", amount: 34 }
                ], 
                true
            );
        });
    });

    it("displays error when subtotal and items do not match", async () => {
        const mockOnCalculated = vi.fn();
        render(
            <SmartSplitCalculator 
                totalAmount={100000} 
                splitPeople={["A", "B"]} 
                onSharesCalculated={mockOnCalculated} 
            />
        );

        const numInputs = screen.getAllByRole("textbox").filter(i => i.getAttribute("inputmode") === "numeric");
        act(() => {
            fireEvent.change(numInputs[0], { target: { value: "100000" } }); 
            fireEvent.change(numInputs[1], { target: { value: "80000" } });
        });

        await waitFor(() => {
            expect(screen.queryByText("Sisa: Rp20.000")).not.toBeNull();
            expect(mockOnCalculated).toHaveBeenLastCalledWith([], false);
        });

        act(() => {
            fireEvent.change(numInputs[1], { target: { value: "120000" } });
        });

        await waitFor(() => {
            expect(screen.queryByText("Lebih: Rp20.000")).not.toBeNull();
            expect(mockOnCalculated).toHaveBeenLastCalledWith([], false);
        });
    });
});
