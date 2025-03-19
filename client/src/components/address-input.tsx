import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type AddressInputProps = {
  form: UseFormReturn<any>;
  fieldPrefix: string;
  label: string;
  description?: string;
};

export function AddressInput({ form, fieldPrefix, label, description }: AddressInputProps) {
  return (
    <div className="bg-white p-4 rounded-md border border-neutral-200 shadow-sm">
      <h3 className="text-lg font-medium text-neutral-700 mb-2">{label}</h3>
      {description && <p className="text-sm text-neutral-500 mb-4">{description}</p>}
      
      <div className="grid grid-cols-1 gap-4">
        <FormField
          control={form.control}
          name={`${fieldPrefix}Street`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rua e Número</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Av. Paulista, 1000" 
                  {...field} 
                  className="bg-white text-black border-neutral-300"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`${fieldPrefix}City`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: São Paulo" 
                    {...field} 
                    className="bg-white text-black border-neutral-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name={`${fieldPrefix}State`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: SP" 
                    {...field} 
                    className="bg-white text-black border-neutral-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}