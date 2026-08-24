// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [
		starlight({
			title: 'Arche API',
			description: 'Documentación técnica del backend de Arche',
			customCss: ['./src/styles/global.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/Kayser-Peru/arche_backend' },
			],
			sidebar: [
				{
					label: 'Introducción',
					items: [{ autogenerate: { directory: 'introduccion' } }],
				},
				{
					label: 'Arquitectura',
					items: [{ autogenerate: { directory: 'arquitectura' } }],
				},
				{
					// Un grupo por dominio dentro de modulos/. Agregar un dominio nuevo
					// es crear la carpeta modulos/<dominio>/ - el sidebar la recoge sola,
					// no hace falta tocar este archivo.
					label: 'Módulos',
					items: [{ autogenerate: { directory: 'modulos' } }],
				},
				{
					label: 'Referencia',
					items: [{ autogenerate: { directory: 'referencia' } }],
				},
			],
		}),
	],
});
