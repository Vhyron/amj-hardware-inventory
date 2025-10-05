import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

interface Props {
	title?: string;
	onChange: (value: string) => void;
}

export default function SearchInput({ title = "Search", onChange }: Props) {
	return (
		<Input
			placeholder={`Search ${title || ""}`}
			prefix={<SearchOutlined style={{ color: "#888" }} />}
			onChange={(e) => onChange(e.target.value)}
			style={{
				borderRadius: "5px",
				backgroundColor: "white",
				borderColor: "#e6e6e6",
			}}
		/>
	);
}
