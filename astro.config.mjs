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
			title: 'Arche',
			description: 'Documentación técnica del backend de Arche',
			favicon: '/ico.svg',
			logo: {
				light: './src/assets/brand/logo-light.png',
				dark: './src/assets/brand/logo-dark.png',
				replacesTitle: true,
			},
			customCss: ['./src/styles/global.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/Kayser-Peru/arche_backend' },
			],
			sidebar: [
				{
					label: 'FrontEnd',
					items: [{ autogenerate: { directory: 'frontend' } }],
				},
				{
					label: 'Backend',
					items: [
						{
							label: 'Introducción',
							items: [{ autogenerate: { directory: 'backend/introduccion' } }],
						},
						{
							label: 'Arquitectura por capas',
							items: [{ autogenerate: { directory: 'backend/arquitectura' } }],
						},
						{
							// Un grupo por dominio dentro de backend/modulos/. Agregar un dominio
							// nuevo es crear la carpeta backend/modulos/<dominio>/ - el sidebar
							// la recoge sola, no hace falta tocar este archivo.
							label: 'Módulos',
							items: [{ autogenerate: { directory: 'backend/modulos' } }],
						},
						{
							label: 'Referencia',
							items: [{ autogenerate: { directory: 'backend/referencia' } }],
						},
					],
				},
				{
					label: 'Base de datos',
					items: [{ autogenerate: { directory: 'base-de-datos' } }],
				},
				{
					label: 'Infraestructura',
					items: [{ autogenerate: { directory: 'infraestructura' } }],
				},
				{
					label: 'Arquitectura',
					items: [{ autogenerate: { directory: 'arquitectura' } }],
				},
			],
		}),
	],
});
