#!/bin/bash

# Push database migrations to Supabase
echo "Pushing database migrations to Supabase..."
echo "Y" | npx supabase db push

echo "Done!"
