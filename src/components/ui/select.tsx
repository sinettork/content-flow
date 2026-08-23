import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type NativeOptionElement = React.ReactElement<
  React.OptionHTMLAttributes<HTMLOptionElement>,
  "option"
>;

const EMPTY_VALUE = "__contentflow_empty__";

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "children"> {
  children?: React.ReactNode;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  placeholder?: string;
}

function optionLabel(option: NativeOptionElement) {
  return typeof option.props.children === "string" ? option.props.children : String(option.props.value ?? "");
}

function toChangeEvent(value: string) {
  return { target: { value }, currentTarget: { value } } as React.ChangeEvent<HTMLSelectElement>;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, children, value, defaultValue, onChange, disabled, placeholder, ...props }, ref) => {
    const options = React.Children.toArray(children).filter(
      (child): child is NativeOptionElement => React.isValidElement(child) && child.type === "option"
    );
    const selected = options.find((option) => String(option.props.value ?? "") === String(value ?? defaultValue ?? ""));

    return (
      <SelectPrimitive.Root
        value={value == null ? undefined : String(value) || EMPTY_VALUE}
        defaultValue={defaultValue == null ? undefined : String(defaultValue) || EMPTY_VALUE}
        disabled={disabled}
        onValueChange={(nextValue) => onChange?.(toChangeEvent(nextValue === EMPTY_VALUE ? "" : nextValue))}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input/80 bg-background/80 px-3 py-1.5 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-offset-background transition-all duration-200 ease-out placeholder:text-muted-foreground focus:border-ring/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/15 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          aria-label={props["aria-label"]}
          id={props.id}
          name={props.name}
        >
          <SelectPrimitive.Value placeholder={placeholder ?? optionLabel(selected ?? options[0])} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border/80 bg-popover text-popover-foreground shadow-[0_18px_45px_rgba(15,23,42,0.12)] animate-in fade-in-80 zoom-in-95">
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => {
                const optionValue = String(option.props.value ?? "");

                return (
                  <SelectPrimitive.Item
                    key={optionValue}
                    value={optionValue || EMPTY_VALUE}
                    disabled={option.props.disabled}
                    className="relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-7 pr-2 text-sm outline-none transition-colors duration-150 focus:bg-accent/70 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="h-4 w-4" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{optionLabel(option)}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);
Select.displayName = "Select";
