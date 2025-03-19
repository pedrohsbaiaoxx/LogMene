import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

type AddressInputProps = {
  form: UseFormReturn<any>;
  fieldPrefix: string;
  label: string;
  description?: string;
};

export function AddressInput({ form, fieldPrefix, label, description }: AddressInputProps) {
  const [addressInput, setAddressInput] = useState("");
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Inicializar o autocomplete
    const options = {
      componentRestrictions: { country: "br" },
      fields: ["address_components", "formatted_address"],
    };

    autocompleteRef.current = new google.maps.places.Autocomplete(
      inputRef.current,
      options
    );

    // Listener para quando um lugar é selecionado
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.address_components) return;

      let streetNumber = "";
      let route = "";
      let city = "";
      let state = "";

      // Extrair os componentes do endereço
      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes("street_number")) {
          streetNumber = component.long_name;
        } else if (types.includes("route")) {
          route = component.long_name;
        } else if (types.includes("administrative_area_level_2")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          state = component.short_name;
        }
      });

      // Atualizar os campos do formulário
      form.setValue(`${fieldPrefix}Street`, `${route}${streetNumber ? `, ${streetNumber}` : ""}`);
      form.setValue(`${fieldPrefix}City`, city);
      form.setValue(`${fieldPrefix}State`, state);

      // Atualizar o input de visualização
      setAddressInput(place.formatted_address || "");
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [form, fieldPrefix]);

  return (
    <div className="space-y-4">
      <div>
        <FormLabel>{label}</FormLabel>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Digite o endereço para autocompletar"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
        />
        {description && (
          <FormDescription>{description}</FormDescription>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name={`${fieldPrefix}Street`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rua</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Rua e número" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${fieldPrefix}City`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Cidade" />
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
                <Input {...field} placeholder="UF" maxLength={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}