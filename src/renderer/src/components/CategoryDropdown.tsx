import React, { useEffect } from "react";
import { Select } from "antd";
import { useCategoryStore } from "../store/categoryStore";

interface CategoryDropdownProps {
	selectedCategory?: string;
	onSelect?: (value: string) => void;
	label?: string;
	showAllOption?: boolean;
	value?: string;
	onChange?: (value: string) => void;
	allowClear?: boolean;
	style?: React.CSSProperties;
}

const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
	selectedCategory,
	onSelect,
	label = "Category",
	showAllOption = true,
	value,
	onChange,
	allowClear,
	style
}) => {
	// Get categories from store
	const { categories, fetchCategories } = useCategoryStore();

	// Fetch categories on component mount
	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	const handleChange = (value: string) => {
		if (onSelect) onSelect(value);
		if (onChange) onChange(value);
	};

	// Create options array including "All Categories" option if enabled
	const options = [
		...(showAllOption ? [{ value: "All Categories", label: "All Categories" }] : []),
		...categories.map((cat) => ({
			value: cat.name,
			label: cat.name
		}))
	];

	return (
		<Select
			size="middle"
			placeholder={label}
			value={value !== undefined ? value : selectedCategory}
			onChange={handleChange}
			allowClear={allowClear}
			style={{ 
				width: '100%', 
				borderRadius: "5px",
				backgroundColor: "white",
				...style
			}}
			options={options}
		/>
	);
};

export default CategoryDropdown;
